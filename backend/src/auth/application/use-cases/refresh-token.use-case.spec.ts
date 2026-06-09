import { AuthenticatedUser } from '../authenticated-user';
import {
  CreateRefreshTokenInput,
  RefreshTokenRepository,
} from '../ports/refresh-token.repository.port';
import { RefreshTokenHasher } from '../ports/refresh-token-hasher.port';
import { AuthTokenIssuer } from '../ports/auth-token-issuer.port';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import {
  RefreshTokenExpiredError,
  RefreshTokenInvalidError,
  RefreshTokenReusedError,
} from '../../domain/errors/refresh-token.errors';
import { RefreshTokenUseCase } from './refresh-token.use-case';

class RefreshTokenRepositoryMock extends RefreshTokenRepository {
  tokens = new Map<string, RefreshToken>();
  created: CreateRefreshTokenInput[] = [];
  revoked: Array<{ id: string; revokedAt: Date }> = [];
  revokedAll: Array<{ userId: string; revokedAt: Date }> = [];

  findByJti(jti: string): Promise<RefreshToken | null> {
    return Promise.resolve(this.tokens.get(jti) ?? null);
  }

  create(input: CreateRefreshTokenInput): Promise<RefreshToken> {
    this.created.push(input);
    const token = new RefreshToken(
      `refresh-${this.created.length}`,
      input.jti,
      input.tokenHash,
      input.user.userId,
      input.user.email,
      input.user.role,
      input.expiresAt,
      null,
    );
    this.tokens.set(input.jti, token);
    return Promise.resolve(token);
  }

  revoke(id: string, revokedAt: Date): Promise<void> {
    this.revoked.push({ id, revokedAt });
    return Promise.resolve();
  }

  revokeAllForUser(userId: string, revokedAt: Date): Promise<void> {
    this.revokedAll.push({ userId, revokedAt });
    return Promise.resolve();
  }
}

class RefreshTokenHasherMock extends RefreshTokenHasher {
  verifyResult = true;
  hashCalls: string[] = [];
  verifyCalls: Array<{ hash: string; plainToken: string }> = [];

  hash(plainToken: string): Promise<string> {
    this.hashCalls.push(plainToken);
    return Promise.resolve(`hashed:${plainToken}`);
  }

  verify(hash: string, plainToken: string): Promise<boolean> {
    this.verifyCalls.push({ hash, plainToken });
    return Promise.resolve(this.verifyResult);
  }
}

class AuthTokenIssuerMock extends AuthTokenIssuer {
  nextJti = 'new-jti';
  issuedAccess: AuthenticatedUser[] = [];
  issuedRefresh: Array<{ user: AuthenticatedUser; jti: string }> = [];

  issueAccessToken(user: AuthenticatedUser): string {
    this.issuedAccess.push(user);
    return `access:${user.userId}`;
  }

  issueRefreshToken(user: AuthenticatedUser, jti: string): string {
    this.issuedRefresh.push({ user, jti });
    return `refresh:${jti}:${user.userId}`;
  }
}

describe('RefreshTokenUseCase', () => {
  const now = new Date('2026-06-08T10:00:00.000Z');
  const user: AuthenticatedUser = {
    userId: 'user-1',
    email: 'john@example.com',
    role: 'USER',
  };

  function createUseCase(
    repository = new RefreshTokenRepositoryMock(),
    hasher = new RefreshTokenHasherMock(),
    tokenIssuer = new AuthTokenIssuerMock(),
  ): RefreshTokenUseCase {
    return new RefreshTokenUseCase(
      repository,
      hasher,
      tokenIssuer,
      () => now,
      () => tokenIssuer.nextJti,
    );
  }

  it('rotates a valid refresh token and revokes the old token', async () => {
    const repository = new RefreshTokenRepositoryMock();
    repository.tokens.set(
      'old-jti',
      new RefreshToken(
        'refresh-1',
        'old-jti',
        'stored-hash',
        user.userId,
        user.email,
        user.role,
        new Date('2026-06-15T10:00:00.000Z'),
      ),
    );
    const hasher = new RefreshTokenHasherMock();
    const tokenIssuer = new AuthTokenIssuerMock();
    tokenIssuer.nextJti = 'new-jti';
    const useCase = createUseCase(repository, hasher, tokenIssuer);

    const result = await useCase.execute({
      refreshToken: 'old-refresh-token',
      payload: {
        sub: user.userId,
        email: user.email,
        role: user.role,
        jti: 'old-jti',
      },
    });

    expect(result).toEqual({
      accessToken: 'access:user-1',
      refreshToken: 'refresh:new-jti:user-1',
      expiresIn: 900,
    });
    expect(hasher.verifyCalls).toEqual([
      { hash: 'stored-hash', plainToken: 'old-refresh-token' },
    ]);
    expect(repository.revoked).toEqual([{ id: 'refresh-1', revokedAt: now }]);
    expect(repository.created).toHaveLength(1);
    expect(repository.created[0]).toMatchObject({
      jti: 'new-jti',
      tokenHash: 'hashed:refresh:new-jti:user-1',
      user,
      expiresAt: new Date('2026-06-15T10:00:00.000Z'),
    });
  });

  it('revokes all user tokens when a revoked refresh token is reused', async () => {
    const repository = new RefreshTokenRepositoryMock();
    repository.tokens.set(
      'old-jti',
      new RefreshToken(
        'refresh-1',
        'old-jti',
        'stored-hash',
        user.userId,
        user.email,
        user.role,
        new Date('2026-06-15T10:00:00.000Z'),
        new Date('2026-06-08T09:00:00.000Z'),
      ),
    );
    const useCase = createUseCase(repository);

    await expect(
      useCase.execute({
        refreshToken: 'old-refresh-token',
        payload: {
          sub: user.userId,
          email: user.email,
          role: user.role,
          jti: 'old-jti',
        },
      }),
    ).rejects.toBeInstanceOf(RefreshTokenReusedError);

    expect(repository.revokedAll).toEqual([
      { userId: user.userId, revokedAt: now },
    ]);
  });

  it('throws RefreshTokenExpiredError when the refresh token is expired', async () => {
    const repository = new RefreshTokenRepositoryMock();
    repository.tokens.set(
      'old-jti',
      new RefreshToken(
        'refresh-1',
        'old-jti',
        'stored-hash',
        user.userId,
        user.email,
        user.role,
        new Date('2026-06-08T09:59:59.000Z'),
      ),
    );
    const useCase = createUseCase(repository);

    await expect(
      useCase.execute({
        refreshToken: 'old-refresh-token',
        payload: {
          sub: user.userId,
          email: user.email,
          role: user.role,
          jti: 'old-jti',
        },
      }),
    ).rejects.toBeInstanceOf(RefreshTokenExpiredError);
  });

  it('throws RefreshTokenInvalidError when the hash does not match', async () => {
    const repository = new RefreshTokenRepositoryMock();
    repository.tokens.set(
      'old-jti',
      new RefreshToken(
        'refresh-1',
        'old-jti',
        'stored-hash',
        user.userId,
        user.email,
        user.role,
        new Date('2026-06-15T10:00:00.000Z'),
      ),
    );
    const hasher = new RefreshTokenHasherMock();
    hasher.verifyResult = false;
    const useCase = createUseCase(repository, hasher);

    await expect(
      useCase.execute({
        refreshToken: 'old-refresh-token',
        payload: {
          sub: user.userId,
          email: user.email,
          role: user.role,
          jti: 'old-jti',
        },
      }),
    ).rejects.toBeInstanceOf(RefreshTokenInvalidError);
  });
});
