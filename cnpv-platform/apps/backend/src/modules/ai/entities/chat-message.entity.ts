import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id' })
  @Index()
  sessionId: string;

  @Column({ length: 10 })
  role: 'user' | 'assistant';

  @Column({ name: 'content_ar', type: 'text' })
  contentAr: string;

  @Column({ name: 'answer_short', nullable: true, type: 'text' })
  answerShort: string | null;

  @Column({ name: 'answer_steps', type: 'jsonb', nullable: true })
  answerSteps: any;

  @Column({ name: 'answer_warnings', type: 'simple-array', nullable: true })
  answerWarnings: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  citations: any;

  @Column({ name: 'confidence_level', nullable: true })
  confidenceLevel: string | null;

  @Column({ name: 'no_source_flag', default: false })
  noSourceFlag: boolean;

  @Column({ name: 'raw_claude_response', type: 'jsonb', nullable: true, select: false })
  rawClaudeResponse: any;

  @Column({ name: 'prompt_tokens', nullable: true })
  promptTokens: number | null;

  @Column({ name: 'completion_tokens', nullable: true })
  completionTokens: number | null;

  @Column({ name: 'latency_ms', nullable: true })
  latencyMs: number | null;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
}
