import { AuthenticatedUser } from '../authenticated-user';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';

export interface CreateRefreshTokenInput {
  jti: string;
  tokenHash: string;
  user: AuthenticatedUser;
  expiresAt: Date;
}

export abstract class RefreshTokenRepository {
  abstract findByJti(jti: string): Promise<RefreshToken | null>;
  abstract create(input: CreateRefreshTokenInput): Promise<RefreshToken>;
  abstract revoke(id: string, revokedAt: Date): Promise<void>;
  abstract revokeAllForUser(userId: string, revokedAt: Date): Promise<void>;
}
