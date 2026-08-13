import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'hospital_id', nullable: true })
  @Index()
  hospitalId: string | null;

  @Column({ name: 'user_id', nullable: true })
  @Index()
  userId: string | null;

  @Column({ name: 'user_email', nullable: true })
  userEmail: string | null;

  @Column({ name: 'user_role', nullable: true })
  userRole: string | null;

  @Column({ name: 'event_type' })
  @Index()
  eventType: string;

  @Column({ name: 'entity_type', nullable: true })
  entityType: string | null;

  @Column({ name: 'entity_id', nullable: true, type: 'uuid' })
  @Index()
  entityId: string | null;

  @Column({ name: 'ip_address', nullable: true, type: 'inet' })
  ipAddress: string | null;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string | null;

  @Column({ name: 'request_method', nullable: true })
  requestMethod: string | null;

  @Column({ name: 'request_path', nullable: true })
  requestPath: string | null;

  @Column({ name: 'old_values', type: 'jsonb', nullable: true })
  oldValues: any;

  @Column({ name: 'new_values', type: 'jsonb', nullable: true })
  newValues: any;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ default: true })
  success: boolean;

  @Column({ name: 'error_message', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
}
