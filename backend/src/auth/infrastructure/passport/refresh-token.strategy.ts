import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfiguration } from '../../../config/app.config';
import { JwtRefreshTokenPayload } from '../../application/jwt-refresh-token-payload';
import { getJwtRefreshSecret } from '../security/jwt-config';
import { RefreshTokenRequestUser } from './refresh-token-request';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: ConfigService<AppConfiguration, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      passReqToCallback: true,
      secretOrKey: getJwtRefreshSecret(configService),
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
