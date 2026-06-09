import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

interface PassportJwtErrorInfo {
  name?: string;
}

@Injectable()
export class RefreshTokenGuard extends AuthGuard('jwt-refresh') {
  handleRequest<TUser>(
    err: Error | null,
    user: TUser | false,
    info: PassportJwtErrorInfo | null,
  ): TUser {
    if (info?.name === 'TokenExpiredError') {
      throw new UnauthorizedException('Refresh token expired');
    }

    if (err || !user) {
      throw err ?? new UnauthorizedException('Invalid refresh token');
    }

    return user;
  }
}
