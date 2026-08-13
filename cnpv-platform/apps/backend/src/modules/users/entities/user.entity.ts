import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { UserRole } from '@cnpv/shared-types';
import { Hospital } from '../../hospitals/entities/hospital.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'hospital_id', nullable: true })
  @Index()
  hospitalId: string | null;

  @ManyToOne(() => Hospital, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'hospital_id' })
  hospital: Hospital;

  @Column({ name: 'employee_id', nullable: true, unique: true })
  employeeId: string | null;

  @Column({ name: 'full_name_ar' })
  fullNameAr: string;

  @Column({ name: 'full_name_en', nullable: true })
  fullNameEn: string | null;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column({ name: 'password_hash', select: false })
  passwordHash: string;

  @Column({ type: 'varchar', length: 50, default: UserRole.NURSE })
  @Index()
  role: UserRole;

  @Column({ nullable: true })
  department: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_mfa_enabled', default: false })
  isMfaEnabled: boolean;

  @Column({ name: 'mfa_secret', nullable: true, select: false })
  mfaSecret: string | null;

  @Column({ name: 'last_login_at', nullable: true })
  lastLoginAt: Date | null;

  @Column({ name: 'failed_login_count', default: 0 })
  failedLoginCount: number;

  @Column({ name: 'locked_until', nullable: true })
  lockedUntil: Date | null;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
