import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditEventType } from '@cnpv/shared-types';

interface LogOptions {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  hospitalId?: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestMethod?: string;
  requestPath?: string;
  oldValues?: any;
  newValues?: any;
  metadata?: any;
  success?: boolean;
  errorMessage?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(eventType: AuditEventType, options: LogOptions = {}): Promise<void> {
    const log = this.auditRepo.create({
      eventType,
      success: true,
      ...options,
    });
    await this.auditRepo.save(log).catch(() => {
      // Audit logging must never break the main flow
    });
  }

  async query(filters: {
    hospitalId?: string;
    userId?: string;
    eventType?: string;
    entityType?: string;
    entityId?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }) {
    const { hospitalId, userId, eventType, entityType, entityId, from, to, page = 1, limit = 50 } = filters;
    const qb = this.auditRepo.createQueryBuilder('al').orderBy('al.createdAt', 'DESC');

    if (hospitalId) qb.andWhere('al.hospitalId = :hospitalId', { hospitalId });
    if (userId) qb.andWhere('al.userId = :userId', { userId });
    if (eventType) qb.andWhere('al.eventType = :eventType', { eventType });
    if (entityType) qb.andWhere('al.entityType = :entityType', { entityType });
    if (entityId) qb.andWhere('al.entityId = :entityId', { entityId });
    if (from && to) qb.andWhere('al.createdAt BETWEEN :from AND :to', { from, to });

    qb.skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
