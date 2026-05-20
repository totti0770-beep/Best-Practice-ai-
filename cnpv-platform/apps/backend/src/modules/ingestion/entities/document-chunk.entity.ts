import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

@Entity('document_chunks')
export class DocumentChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id' })
  @Index()
  documentId: string;

  @Column({ name: 'version_id' })
  versionId: string;

  @Column({ name: 'hospital_id' })
  @Index()
  hospitalId: string;

  @Column({ name: 'chunk_index' })
  chunkIndex: number;

  @Column({ name: 'content_text', type: 'text' })
  contentText: string;

  @Column({ name: 'page_number', nullable: true })
  pageNumber: number | null;

  @Column({ name: 'token_count', nullable: true })
  tokenCount: number | null;

  // vector(1024) stored as JSON array; queried via raw SQL
  @Column({ type: 'text', nullable: true, select: false })
  embedding: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
