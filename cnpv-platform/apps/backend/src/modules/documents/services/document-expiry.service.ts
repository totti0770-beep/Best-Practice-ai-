import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Document } from '../entities/document.entity';
import { DocumentStatus } from '@cnpv/shared-types';
import { NotificationsService } from '../../notifications/notifications.service';
import { AuditService } from '../../audit/audit.service';
import { AuditEventType } from '@cnpv/shared-types';

@Injectable()
export class DocumentExpiryService {
  private readonly logger = new Logger(DocumentExpiryService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkExpiry(): Promise<void> {
    this.logger.log('Running document expiry check...');
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAhead = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    // Expire documents past their expiry date
    const expiredDocs = await this.documentRepo.find({
      where: { status: DocumentStatus.ACTIVE, expiryDate: LessThanOrEqual(today) as any },
    });

    for (const doc of expiredDocs) {
      await this.documentRepo.update(doc.id, { status: DocumentStatus.EXPIRED });
      this.eventEmitter.emit('document.expired', { documentId: doc.id, hospitalId: doc.hospitalId });
      await this.auditService.log(AuditEventType.DOCUMENT_EXPIRED, {
        entityType: 'document',
        entityId: doc.id,
        hospitalId: doc.hospitalId,
        metadata: { reason: 'auto_expiry', expiryDate: doc.expiryDate },
      });
      this.logger.log(`Document ${doc.id} expired automatically`);
    }

    // Notify about documents expiring within 30 days
    const expiringSoon = await this.documentRepo
      .createQueryBuilder('d')
      .where('d.status = :status', { status: DocumentStatus.ACTIVE })
      .andWhere('d.expiry_date <= :thirtyDays', { thirtyDays: thirtyDaysAhead })
      .andWhere('d.expiry_date > :today', { today })
      .getMany();

    for (const doc of expiringSoon) {
      await this.notificationsService.create({
        hospitalId: doc.hospitalId,
        targetRole: 'knowledge_manager',
        type: 'document_expiring',
        titleAr: `تنبيه: وثيقة قاربت على الانتهاء — ${doc.titleAr}`,
        bodyAr: `الوثيقة "${doc.titleAr}" ستنتهي صلاحيتها بتاريخ ${doc.expiryDate}`,
        entityType: 'document',
        entityId: doc.id,
      });
    }
  }
}
