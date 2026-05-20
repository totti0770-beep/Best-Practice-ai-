import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { DocumentStatus, DocumentCategory } from '@cnpv/shared-types';
import { Hospital } from '../../hospitals/entities/hospital.entity';
import { User } from '../../users/entities/user.entity';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'hospital_id' })
  @Index()
  hospitalId: string;

  @ManyToOne(() => Hospital)
  @JoinColumn({ name: 'hospital_id' })
  hospital: Hospital;

  @Column({ name: 'title_ar' })
  titleAr: string;

  @Column({ name: 'title_en', nullable: true })
  titleEn: string | null;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  category: DocumentCategory;

  @Column({ type: 'varchar', length: 30, default: DocumentStatus.DRAFT })
  @Index()
  status: DocumentStatus;

  @Column({ name: 'version_number', default: 1 })
  versionNumber: number;

  @Column({ name: 'current_version_id', nullable: true })
  currentVersionId: string | null;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: string | null;

  @Column({ name: 'effective_date', type: 'date', nullable: true })
  effectiveDate: string | null;

  @Column({ name: 'document_number', nullable: true })
  documentNumber: string | null;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ name: 'uploaded_by' })
  uploadedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by' })
  uploader: User;

  @Column({ name: 'reviewed_by', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'rejected_reason', nullable: true })
  rejectedReason: string | null;

  @Column({ name: 'indexed_at', nullable: true })
  indexedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
