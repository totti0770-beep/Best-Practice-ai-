import { UserRole } from '@cnpv/shared-types';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  hospitalId: string | null;
  mfaPending?: boolean;
}
