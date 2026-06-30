import { IssueAuthTokensUseCase } from './issue-auth-tokens.use-case';
import type { AuthTokensResult } from '../auth-tokens-result';
import { JwtRefreshTokenPayload } from '../jwt-refresh-token-payload';
import { RefreshTokenHasher } from '../ports/refresh-token-hasher.port';
import { RefreshTokenRepository } from '../ports/refresh-token.repository.port';
import {
  RefreshTokenExpiredError,
  RefreshTokenInvalidError,
  RefreshTokenReusedError,
} from '../../domain/errors/refresh-token.errors';
import { AuthTokenIssuer } from '../ports/auth-token-issuer.port';

interface RefreshTokenInput {
  refreshToken: string;
  payload: JwtRefreshTokenPayload;
}

export class RefreshTokenUseCase {
  private readonly issueAuthTokensUseCase: IssueAuthTokensUseCase;

  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly refreshTokenHasher: RefreshTokenHasher,
    authTokenIssuer: AuthTokenIssuer,
    private readonly now: () => Date,
    createJti: () => string,
    accessTokenExpiresInSeconds = 900,
    refreshTokenExpiresInSeconds = 7 * 24 * 60 * 60,
  ) {
    this.issueAuthTokensUseCase = new IssueAuthTokensUseCase(
      refreshTokenRepository,
      refreshTokenHasher,
      authTokenIssuer,
      now,
      createJti,
      accessTokenExpiresInSeconds,
      refreshTokenExpiresInSeconds,
    );
  }

  async execute(input: RefreshTokenInput): Promise<AuthTokensResult> {
    const persistedToken = await this.refreshTokenRepository.findByJti(
      input.payload.jti,
    );

    if (!persistedToken) {
      throw new RefreshTokenInvalidError();
    }

    if (persistedToken.userId !== input.payload.sub) {
      throw new RefreshTokenInvalidError();
    }

    if (persistedToken.isRevoked) {
      await this.refreshTokenRepository.revokeAllForUser(
        persistedToken.userId,
        this.now(),
      );
      throw new RefreshTokenReusedError();
    }

    if (persistedToken.isExpired(this.now())) {
      throw new RefreshTokenExpiredError();
    }

    const hashMatches = await this.refreshTokenHasher.verify(
      persistedToken.tokenHash,
      input.refreshToken,
    );

    if (!hashMatches) {
      throw new RefreshTokenInvalidError();
    }

    const revoked = await this.refreshTokenRepository.revokeIfActive(
      persistedToken.id,
      this.now(),
    );

    if (!revoked) {
      await this.refreshTokenRepository.revokeAllForUser(
        persistedToken.userId,
        this.now(),
      );
      throw new RefreshTokenReusedError();
    }

    return this.issueAuthTokensUseCase.execute({
      userId: persistedToken.userId,
      email: persistedToken.userEmail,
      role: persistedToken.userRole,
    });
  }
}
