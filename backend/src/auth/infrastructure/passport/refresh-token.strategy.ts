import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtRefreshTokenPayload } from '../../application/jwt-refresh-token-payload';
import { resolveJwtRefreshSecret } from '../security/jwt-refresh-secret';
import { RefreshTokenRequestUser } from './refresh-token-request';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      passReqToCallback: true,
      secretOrKey: resolveJwtRefreshSecret(),
    });
  }

  validate(
    req: Request,
    payload: JwtRefreshTokenPayload,
  ): RefreshTokenRequestUser {
    const refreshToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return { refreshToken, payload };
  }
}
