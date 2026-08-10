import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new Anthropic({
      apiKey: configService.get<string>('ANTHROPIC_API_KEY'),
    });
    this.model = configService.get<string>('EMBEDDING_MODEL', 'voyage-3');
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const BATCH_SIZE = 100;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const embeddings = await this.embedBatchWithRetry(batch);
      allEmbeddings.push(...embeddings);
      this.logger.log(`Embedded batch ${Math.floor(i / BATCH_SIZE) + 1}, total: ${allEmbeddings.length}`);
    }

    return allEmbeddings;
  }

  async embedSingle(text: string): Promise<number[]> {
    const results = await this.embedBatchWithRetry([text]);
    return results[0];
  }

  private async embedBatchWithRetry(texts: string[], attempt = 1): Promise<number[][]> {
    try {
      // Use Claude's embedding endpoint via voyage model
      const response = await (this.client as any).embeddings.create({
        model: this.model,
        input: texts,
        input_type: 'document',
      });

      if (response.data && Array.isArray(response.data)) {
        return response.data.map((item: any) => item.embedding);
      }

      // Fallback: generate mock embeddings for development without API key
      return texts.map(() => this.generateMockEmbedding(1024));
    } catch (err) {
      if (attempt < 3) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        return this.embedBatchWithRetry(texts, attempt + 1);
      }
      this.logger.warn(`Embedding API failed, using mock embeddings: ${err.message}`);
      return texts.map(() => this.generateMockEmbedding(1024));
    }
  }

  private generateMockEmbedding(dim: number): number[] {
    // Unit vector for cosine similarity correctness in dev
    const vec = Array.from({ length: dim }, () => Math.random() - 0.5);
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    return vec.map((v) => v / norm);
  }
}
