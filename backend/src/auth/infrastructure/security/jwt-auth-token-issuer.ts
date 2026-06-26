import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AppConfiguration } from '../../../config/app.config';
import { AuthenticatedUser } from '../../application/authenticated-user';
import { AuthTokenIssuer } from '../../application/ports/auth-token-issuer.port';
import { JwtAccessTokenPayload } from '../../application/jwt-access-token-payload';
import { JwtRefreshTokenPayload } from '../../application/jwt-refresh-token-payload';
import { getJwtRefreshSecret } from './jwt-config';

@Injectable()
export class JwtAuthTokenIssuer extends AuthTokenIssuer {
  private readonly refreshSecret: string;
  private readonly refreshTokenTtlSeconds: number;

  constructor(
    private readonly jwtService: JwtService,
    configService: ConfigService<AppConfiguration, true>,
  ) {
    super();
    const auth = configService.getOrThrow('auth', { infer: true });
    this.refreshSecret = getJwtRefreshSecret(configService);
    this.refreshTokenTtlSeconds = auth.jwtRefreshTokenTtlSeconds;
  }

  issueAccessToken(user: AuthenticatedUser): string {
    const payload: JwtAccessTokenPayload = {
      sub: user.userId,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  issueRefreshToken(user: AuthenticatedUser, jti: string): string {
    const payload: JwtRefreshTokenPayload = {
      sub: user.userId,
      email: user.email,
      role: user.role,
      jti,
    };

    return this.jwtService.sign(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshTokenTtlSeconds,
    });
  }
}
