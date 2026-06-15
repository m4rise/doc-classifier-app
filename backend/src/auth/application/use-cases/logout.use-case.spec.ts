import {
  CreateRefreshTokenInput,
  RefreshTokenRepository,
} from '../ports/refresh-token.repository.port';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import { LogoutUseCase } from './logout.use-case';

class RefreshTokenRepositoryMock extends RefreshTokenRepository {
  revokedAll: Array<{ userId: string; revokedAt: Date }> = [];

  findByJti(): Promise<RefreshToken | null> {
    return Promise.resolve(null);
  }

  create(input: CreateRefreshTokenInput): Promise<RefreshToken> {
    return Promise.resolve(
      new RefreshToken(
        'refresh-1',
        input.jti,
        input.tokenHash,
        input.user.userId,
        input.user.email,
        input.user.role,
        input.expiresAt,
      ),
    );
  }

  revoke(): Promise<void> {
    return Promise.resolve();
  }

  revokeIfActive(): Promise<boolean> {
    return Promise.resolve(false);
  }

  revokeAllForUser(userId: string, revokedAt: Date): Promise<void> {
    this.revokedAll.push({ userId, revokedAt });
    return Promise.resolve();
  }
}

describe('LogoutUseCase', () => {
  it('revokes all active refresh tokens for the authenticated user', async () => {
    const now = new Date('2026-06-11T10:00:00.000Z');
    const repository = new RefreshTokenRepositoryMock();
    const useCase = new LogoutUseCase(repository, () => now);

    await useCase.execute({ userId: 'user-1' });

    expect(repository.revokedAll).toEqual([
      { userId: 'user-1', revokedAt: now },
    ]);
  });
});
