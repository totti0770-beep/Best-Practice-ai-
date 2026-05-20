import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { ChatSession } from './entities/chat-session.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { EmbeddingsService } from '../ingestion/embeddings.service';
import { VectorStoreService } from '../ingestion/vector-store.service';
import { PromptBuilderService, SearchResultWithMeta } from './prompt-builder.service';
import { AuditService } from '../audit/audit.service';
import {
  AuditEventType, ConfidenceLevel, NO_SOURCE_MESSAGE_AR,
} from '@cnpv/shared-types';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly claude: Anthropic;

  constructor(
    @InjectRepository(ChatSession)
    private readonly sessionRepo: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    private readonly embeddings: EmbeddingsService,
    private readonly vectorStore: VectorStoreService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.claude = new Anthropic({ apiKey: config.get<string>('ANTHROPIC_API_KEY') });
  }

  async createSession(userId: string, hospitalId: string, sessionType = 'general'): Promise<ChatSession> {
    return this.sessionRepo.save(
      this.sessionRepo.create({ userId, hospitalId, sessionType }),
    );
  }

  async getSessions(userId: string): Promise<ChatSession[]> {
    return this.sessionRepo.find({
      where: { userId, isArchived: false },
      order: { updatedAt: 'DESC' },
    });
  }

  async getSession(id: string, userId: string): Promise<ChatSession> {
    const session = await this.sessionRepo.findOne({ where: { id } });
    if (!session) throw new NotFoundException('الجلسة غير موجودة');
    if (session.userId !== userId) throw new ForbiddenException('غير مصرح');
    return session;
  }

  async getMessages(sessionId: string, userId: string, page = 1, limit = 50): Promise<any> {
    await this.getSession(sessionId, userId);
    const [data, total] = await this.messageRepo.findAndCount({
      where: { sessionId },
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async ask(
    sessionId: string,
    question: string,
    userId: string,
    hospitalId: string,
    category?: string,
  ): Promise<ChatMessage> {
    await this.getSession(sessionId, userId);
    const startTime = Date.now();

    // Save user message
    await this.messageRepo.save(
      this.messageRepo.create({ sessionId, role: 'user', contentAr: question }),
    );

    await this.audit.log(AuditEventType.AI_QUERY, {
      userId,
      hospitalId,
      entityType: 'chat_session',
      entityId: sessionId,
      metadata: { question: question.slice(0, 200) },
    });

    try {
      // 1. Embed query
      const queryVector = await this.embeddings.embedSingle(question);

      // 2. ANN search in pgvector
      const topKRetrieve = parseInt(this.config.get('RAG_TOP_K_RETRIEVE', '20'));
      const rawChunks = await this.vectorStore.search(queryVector, hospitalId, topKRetrieve, category);

      // 3. Enrich chunks with document metadata
      const enrichedChunks = await this.enrichChunks(rawChunks);

      // 4. Rerank: simple similarity threshold filter
      const topKRerank = parseInt(this.config.get('RAG_TOP_K_RERANK', '5'));
      const minConfidence = parseFloat(this.config.get('RAG_MIN_CONFIDENCE_THRESHOLD', '0.7'));
      const topChunks = enrichedChunks
        .filter((c) => c.similarity >= minConfidence)
        .slice(0, topKRerank);

      // 5. Build prompt
      const { systemPrompt, userMessage, hasContext } = this.promptBuilder.build(question, topChunks);

      let assistantMessage: ChatMessage;

      if (!hasContext || topChunks.length === 0) {
        assistantMessage = await this.saveNoSourceResponse(sessionId, question, Date.now() - startTime);
      } else {
        // 6. Call Claude
        const response = await this.claude.messages.create({
          model: this.config.get<string>('LLM_MODEL', 'claude-sonnet-4-6'),
          max_tokens: parseInt(this.config.get('LLM_MAX_TOKENS', '2048')),
          temperature: parseFloat(this.config.get('LLM_TEMPERATURE', '0.1')),
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        });

        const latencyMs = Date.now() - startTime;
        const rawText = response.content[0].type === 'text' ? response.content[0].text : '';

        // 7. Parse & validate response
        assistantMessage = await this.parseAndSave(
          sessionId, rawText, topChunks, response, latencyMs,
        );
      }

      // Update session title from first question
      const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
      if (session && !session.titleAr) {
        await this.sessionRepo.update(sessionId, { titleAr: question.slice(0, 100) });
      }

      await this.audit.log(AuditEventType.AI_ANSWER_GENERATED, {
        userId,
        hospitalId,
        entityType: 'chat_message',
        entityId: assistantMessage.id,
        metadata: {
          noSourceFlag: assistantMessage.noSourceFlag,
          confidenceLevel: assistantMessage.confidenceLevel,
          citationCount: assistantMessage.citations?.length ?? 0,
        },
      });

      return assistantMessage;
    } catch (err) {
      this.logger.error(`AI query failed: ${err.message}`);
      return this.saveNoSourceResponse(sessionId, question, Date.now() - startTime);
    }
  }

  private async enrichChunks(chunks: any[]): Promise<SearchResultWithMeta[]> {
    if (chunks.length === 0) return [];

    const docIds = [...new Set(chunks.map((c) => c.documentId))];
    const docs = await this.dataSource.query(
      `SELECT id, title_ar, approved_by, created_at
       FROM documents WHERE id = ANY($1)`,
      [docIds],
    );

    const docMap = Object.fromEntries(docs.map((d: any) => [d.id, d]));

    return chunks.map((chunk) => ({
      ...chunk,
      documentTitleAr: docMap[chunk.documentId]?.title_ar ?? 'وثيقة غير معروفة',
      approvedDate: docMap[chunk.documentId]?.created_at
        ? new Date(docMap[chunk.documentId].created_at).toISOString().split('T')[0]
        : null,
    }));
  }

  private async parseAndSave(
    sessionId: string,
    rawText: string,
    chunks: SearchResultWithMeta[],
    claudeResponse: any,
    latencyMs: number,
  ): Promise<ChatMessage> {
    let parsed: any = {};

    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch {
      // If JSON parse fails, treat as no-source
    }

    const noSourceFlag =
      !parsed.answerShort ||
      parsed.noSourceFlag === true ||
      (!parsed.citations || parsed.citations.length === 0);

    const msg = this.messageRepo.create({
      sessionId,
      role: 'assistant',
      contentAr: noSourceFlag ? NO_SOURCE_MESSAGE_AR : (parsed.answerShort ?? NO_SOURCE_MESSAGE_AR),
      answerShort: noSourceFlag ? NO_SOURCE_MESSAGE_AR : parsed.answerShort,
      answerSteps: parsed.practicalSteps ?? [],
      answerWarnings: parsed.warnings ?? [],
      citations: parsed.citations ?? [],
      confidenceLevel: noSourceFlag ? ConfidenceLevel.NONE : (parsed.confidenceLevel ?? ConfidenceLevel.MEDIUM),
      noSourceFlag,
      rawClaudeResponse: claudeResponse,
      promptTokens: claudeResponse.usage?.input_tokens,
      completionTokens: claudeResponse.usage?.output_tokens,
      latencyMs,
    });

    return this.messageRepo.save(msg);
  }

  private async saveNoSourceResponse(sessionId: string, question: string, latencyMs: number): Promise<ChatMessage> {
    return this.messageRepo.save(
      this.messageRepo.create({
        sessionId,
        role: 'assistant',
        contentAr: NO_SOURCE_MESSAGE_AR,
        answerShort: NO_SOURCE_MESSAGE_AR,
        answerSteps: [],
        answerWarnings: [],
        citations: [],
        confidenceLevel: ConfidenceLevel.NONE,
        noSourceFlag: true,
        latencyMs,
      }),
    );
  }
}
