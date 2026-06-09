import { UserRole } from '../domain/entities/user.entity';

export interface JwtRefreshTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  jti: string;
}
