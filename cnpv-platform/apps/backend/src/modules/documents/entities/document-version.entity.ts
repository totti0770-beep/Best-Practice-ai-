import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Document } from './document.entity';
import { User } from '../../users/entities/user.entity';

@Entity('document_versions')
export class DocumentVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id' })
  documentId: string;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @Column({ name: 'version_number' })
  versionNumber: number;

  @Column({ name: 'minio_bucket', default: 'cnpv-documents' })
  minioBucket: string;

  @Column({ name: 'minio_key', unique: true })
  minioKey: string;

  @Column({ name: 'file_size_bytes', nullable: true, type: 'bigint' })
  fileSizeBytes: number | null;

  @Column({ name: 'sha256_hash', nullable: true, length: 64 })
  sha256Hash: string | null;

  @Column({ name: 'page_count', nullable: true })
  pageCount: number | null;

  @Column({ name: 'uploaded_by' })
  uploadedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by' })
  uploader: User;

  @Column({ name: 'upload_notes', nullable: true })
  uploadNotes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
