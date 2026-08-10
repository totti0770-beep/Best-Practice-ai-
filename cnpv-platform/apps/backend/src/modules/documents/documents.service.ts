import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { DocumentWorkflowService } from './services/document-workflow.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { DocumentStatus, DocumentCategory, AuditEventType, UserRole } from '@cnpv/shared-types';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private readonly versionRepo: Repository<DocumentVersion>,
    private readonly workflowService: DocumentWorkflowService,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(filters: {
    hospitalId: string;
    category?: DocumentCategory;
    status?: DocumentStatus;
    search?: string;
    expiringDays?: number;
    page?: number;
    limit?: number;
  }) {
    const { hospitalId, category, status, search, expiringDays, page = 1, limit = 20 } = filters;
    const qb = this.documentRepo.createQueryBuilder('d')
      .where('d.hospitalId = :hospitalId', { hospitalId });

    if (category) qb.andWhere('d.category = :category', { category });
    if (status) qb.andWhere('d.status = :status', { status });
    if (search) qb.andWhere('d.titleAr ILIKE :s OR d.documentNumber ILIKE :s', { s: `%${search}%` });
    if (expiringDays) {
      const cutoff = new Date(Date.now() + expiringDays * 86400000).toISOString().split('T')[0];
      qb.andWhere('d.expiryDate <= :cutoff', { cutoff });
    }

    qb.orderBy('d.createdAt', 'DESC').skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, hospitalId?: string): Promise<Document> {
    const qb = this.documentRepo.createQueryBuilder('d').where('d.id = :id', { id });
    if (hospitalId) qb.andWhere('d.hospitalId = :hospitalId', { hospitalId });
    const doc = await qb.getOne();
    if (!doc) throw new NotFoundException('الوثيقة غير موجودة');
    return doc;
  }

  async upload(
    file: Express.Multer.File,
    data: {
      titleAr: string;
      titleEn?: string;
      category: DocumentCategory;
      expiryDate?: string;
      effectiveDate?: string;
      documentNumber?: string;
      tags?: string;
    },
    userId: string,
    hospitalId: string,
  ): Promise<Document> {
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('يجب أن يكون الملف بصيغة PDF');
    }

    const doc = await this.documentRepo.save(
      this.documentRepo.create({
        titleAr: data.titleAr,
        titleEn: data.titleEn,
        category: data.category,
        expiryDate: data.expiryDate,
        effectiveDate: data.effectiveDate,
        documentNumber: data.documentNumber,
        tags: data.tags ? data.tags.split(',').map((t) => t.trim()) : [],
        hospitalId,
        uploadedBy: userId,
        status: DocumentStatus.DRAFT,
        versionNumber: 1,
      }),
    );

    const minioKey = this.storageService.buildKey(hospitalId, doc.id, 1);
    const hash = this.storageService.computeHash(file.buffer);
    await this.storageService.upload(minioKey, file.buffer);

    const version = await this.versionRepo.save(
      this.versionRepo.create({
        documentId: doc.id,
        versionNumber: 1,
        minioKey,
        fileSizeBytes: file.size,
        sha256Hash: hash,
        uploadedBy: userId,
      }),
    );

    await this.documentRepo.update(doc.id, { currentVersionId: version.id });
    await this.auditService.log(AuditEventType.DOCUMENT_UPLOADED, {
      userId,
      hospitalId,
      entityType: 'document',
      entityId: doc.id,
      metadata: { titleAr: doc.titleAr, category: doc.category },
    });

    return this.findOne(doc.id);
  }

  async transition(
    id: string,
    toStatus: DocumentStatus,
    userId: string,
    userRole: UserRole,
    hospitalId: string,
    notes?: string,
  ): Promise<Document> {
    const doc = await this.findOne(id, hospitalId);
    this.workflowService.validateTransition(doc, toStatus, userRole);

    const updates: Partial<Document> = { status: toStatus };
    if (toStatus === DocumentStatus.APPROVED) updates.approvedBy = userId;
    if (toStatus === DocumentStatus.UNDER_REVIEW) updates.reviewedBy = userId;
    if (toStatus === DocumentStatus.REJECTED) updates.rejectedReason = notes;
    if (toStatus === DocumentStatus.INDEXED) updates.indexedAt = new Date();

    await this.documentRepo.update(id, updates);
    this.workflowService.emitTransitionEvent(doc, toStatus);

    const eventMap: Record<string, AuditEventType> = {
      [DocumentStatus.UNDER_REVIEW]: AuditEventType.DOCUMENT_SUBMITTED_REVIEW,
      [DocumentStatus.APPROVED]: AuditEventType.DOCUMENT_APPROVED,
      [DocumentStatus.REJECTED]: AuditEventType.DOCUMENT_REJECTED,
      [DocumentStatus.INDEXED]: AuditEventType.DOCUMENT_INDEXED,
      [DocumentStatus.ACTIVE]: AuditEventType.DOCUMENT_ACTIVATED,
      [DocumentStatus.EXPIRED]: AuditEventType.DOCUMENT_EXPIRED,
    };

    if (eventMap[toStatus]) {
      await this.auditService.log(eventMap[toStatus], {
        userId,
        hospitalId,
        entityType: 'document',
        entityId: id,
        metadata: { fromStatus: doc.status, toStatus, notes },
      });
    }

    return this.findOne(id);
  }

  async getSignedViewUrl(id: string, userId: string, hospitalId: string): Promise<string> {
    const doc = await this.findOne(id, hospitalId);
    if (!doc.currentVersionId) throw new BadRequestException('لا توجد نسخة للوثيقة');

    const version = await this.versionRepo.findOne({ where: { id: doc.currentVersionId } });
    if (!version) throw new NotFoundException('النسخة غير موجودة');

    await this.auditService.log(AuditEventType.DOCUMENT_VIEWED, {
      userId,
      hospitalId,
      entityType: 'document',
      entityId: id,
    });

    return this.storageService.getSignedUrl(version.minioKey, 30);
  }

  async getVersions(id: string, hospitalId: string): Promise<DocumentVersion[]> {
    await this.findOne(id, hospitalId);
    return this.versionRepo.find({
      where: { documentId: id },
      order: { versionNumber: 'DESC' },
    });
  }
}
