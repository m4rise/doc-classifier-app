import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { isPassportJwtTokenExpiredError } from './passport-jwt-error-info';

@Injectable()
export class RefreshTokenGuard extends AuthGuard('jwt-refresh') {
  handleRequest<TUser>(
    err: Error | null,
    user: TUser | false,
    info: unknown,
  ): TUser {
    if (isPassportJwtTokenExpiredError(info)) {
      throw new UnauthorizedException('Refresh token expired');
    }

    if (err || !user) {
      throw err ?? new UnauthorizedException('Invalid refresh token');
    }

    return user;
  }
}
