import { UserRole } from '../domain/entities/user.entity';

export interface JwtAccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}
