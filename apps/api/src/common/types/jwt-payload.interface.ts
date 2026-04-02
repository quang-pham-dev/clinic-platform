import { Role } from './role.enum';

export interface JwtPayload {
  sub: string; // user UUID
  email: string;
  role: Role;
  departmentId?: string; // P2: embedded for staff roles (head_nurse, nurse, receptionist)
  iat?: number;
  exp?: number;
}
