export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  HOSPITAL_ADMIN = 'hospital_admin',
  KNOWLEDGE_MANAGER = 'knowledge_manager',
  PHARMACIST_REVIEWER = 'pharmacist_reviewer',
  CBAHI_OFFICER = 'cbahi_officer',
  NURSE = 'nurse',
  AUDITOR = 'auditor',
}

export const ADMIN_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.HOSPITAL_ADMIN,
];

export const DOCUMENT_UPLOAD_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.HOSPITAL_ADMIN,
  UserRole.KNOWLEDGE_MANAGER,
  UserRole.PHARMACIST_REVIEWER,
  UserRole.CBAHI_OFFICER,
];

export const DOCUMENT_APPROVE_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.HOSPITAL_ADMIN,
  UserRole.PHARMACIST_REVIEWER,
  UserRole.CBAHI_OFFICER,
];
