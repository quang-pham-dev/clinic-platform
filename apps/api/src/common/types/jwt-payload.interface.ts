import { Role } from './role.enum';

export interface JwtPayload {
  sub: string; // user UUID
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}
