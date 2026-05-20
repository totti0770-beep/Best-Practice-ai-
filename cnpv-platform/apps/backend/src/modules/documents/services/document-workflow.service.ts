import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DocumentStatus, UserRole } from '@cnpv/shared-types';
import { Document } from '../entities/document.entity';

type Transition = {
  from: DocumentStatus;
  to: DocumentStatus;
  allowedRoles: UserRole[];
};

const TRANSITIONS: Transition[] = [
  {
    from: DocumentStatus.DRAFT,
    to: DocumentStatus.UNDER_REVIEW,
    allowedRoles: [UserRole.KNOWLEDGE_MANAGER, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    from: DocumentStatus.UNDER_REVIEW,
    to: DocumentStatus.APPROVED,
    allowedRoles: [UserRole.PHARMACIST_REVIEWER, UserRole.CBAHI_OFFICER, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    from: DocumentStatus.UNDER_REVIEW,
    to: DocumentStatus.REJECTED,
    allowedRoles: [UserRole.PHARMACIST_REVIEWER, UserRole.CBAHI_OFFICER, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    from: DocumentStatus.REJECTED,
    to: DocumentStatus.DRAFT,
    allowedRoles: [UserRole.KNOWLEDGE_MANAGER, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    from: DocumentStatus.APPROVED,
    to: DocumentStatus.INDEXED,
    allowedRoles: [UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    from: DocumentStatus.INDEXED,
    to: DocumentStatus.ACTIVE,
    allowedRoles: [UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    from: DocumentStatus.ACTIVE,
    to: DocumentStatus.EXPIRED,
    allowedRoles: [UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN],
  },
];

@Injectable()
export class DocumentWorkflowService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  validateTransition(document: Document, toStatus: DocumentStatus, userRole: UserRole): void {
    const transition = TRANSITIONS.find(
      (t) => t.from === document.status && t.to === toStatus,
    );

    if (!transition) {
      throw new BadRequestException(
        `لا يمكن الانتقال من حالة '${document.status}' إلى '${toStatus}'`,
      );
    }

    if (!transition.allowedRoles.includes(userRole)) {
      throw new ForbiddenException('ليس لديك صلاحية لهذا الإجراء');
    }
  }

  emitTransitionEvent(document: Document, toStatus: DocumentStatus): void {
    if (toStatus === DocumentStatus.INDEXED) {
      this.eventEmitter.emit('document.index', {
        documentId: document.id,
        versionId: document.currentVersionId,
        hospitalId: document.hospitalId,
      });
    }
    if (toStatus === DocumentStatus.EXPIRED) {
      this.eventEmitter.emit('document.expired', {
        documentId: document.id,
        hospitalId: document.hospitalId,
      });
    }
  }
}
