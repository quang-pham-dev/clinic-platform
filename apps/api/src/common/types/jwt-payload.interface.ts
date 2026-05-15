import { Role } from './role.enum';

export interface JwtPayload {
  sub: string; // user UUID
  email: string;
  role: Role;
  departmentId?: string; // P2: embedded for staff roles (head_nurse, nurse, receptionist)
  tenantId?: string; // P5: embedded for multi-tenant context
  iat?: number;
  exp?: number;
}
