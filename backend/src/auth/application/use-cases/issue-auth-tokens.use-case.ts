import { AuthenticatedUser } from '../authenticated-user';
import { AuthTokenIssuer } from '../ports/auth-token-issuer.port';
import { RefreshTokenHasher } from '../ports/refresh-token-hasher.port';
import { RefreshTokenRepository } from '../ports/refresh-token.repository.port';

export interface AuthTokensResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class IssueAuthTokensUseCase {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly refreshTokenHasher: RefreshTokenHasher,
    private readonly authTokenIssuer: AuthTokenIssuer,
    private readonly now: () => Date,
    private readonly createJti: () => string,
    private readonly accessTokenExpiresInSeconds: number,
    private readonly refreshTokenExpiresInSeconds: number,
  ) {}

  async execute(user: AuthenticatedUser): Promise<AuthTokensResult> {
    const jti = this.createJti();
    const refreshToken = this.authTokenIssuer.issueRefreshToken(user, jti);
    const tokenHash = await this.refreshTokenHasher.hash(refreshToken);

    await this.refreshTokenRepository.create({
      jti,
      tokenHash,
      user,
      expiresAt: new Date(
        this.now().getTime() + this.refreshTokenExpiresInSeconds * 1000,
      ),
    });

    return {
      accessToken: this.authTokenIssuer.issueAccessToken(user),
      refreshToken,
      expiresIn: this.accessTokenExpiresInSeconds,
    };
  }
}
