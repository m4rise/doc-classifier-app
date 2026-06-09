import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedUser } from '../../application/authenticated-user';
import { AuthTokenIssuer } from '../../application/ports/auth-token-issuer.port';
import { JwtAccessTokenPayload } from '../../application/jwt-access-token-payload';
import { JwtRefreshTokenPayload } from '../../application/jwt-refresh-token-payload';
import { resolveJwtRefreshSecret } from './jwt-refresh-secret';

@Injectable()
export class JwtAuthTokenIssuer extends AuthTokenIssuer {
  constructor(private readonly jwtService: JwtService) {
    super();
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
      secret: resolveJwtRefreshSecret(),
      expiresIn: '7d',
    });
  }
}
