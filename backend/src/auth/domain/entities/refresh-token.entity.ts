import { UserRole } from './user.entity';

export class RefreshToken {
  constructor(
    readonly id: string,
    readonly jti: string,
    readonly tokenHash: string,
    readonly userId: string,
    readonly userEmail: string,
    readonly userRole: UserRole,
    readonly expiresAt: Date,
    readonly revokedAt: Date | null = null,
  ) {}

  get isRevoked(): boolean {
    return this.revokedAt !== null;
  }

  isExpired(now: Date): boolean {
    return this.expiresAt <= now;
  }
}
