import { SetMetadata } from '@nestjs/common';
import { AuditEventType } from '@cnpv/shared-types';

export const AUDIT_KEY = 'audit_event';
export const Audit = (eventType: AuditEventType) => SetMetadata(AUDIT_KEY, eventType);
