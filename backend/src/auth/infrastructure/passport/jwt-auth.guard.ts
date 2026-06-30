import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { isPassportJwtTokenExpiredError } from './passport-jwt-error-info';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    info: unknown,
  ): TUser {
    if (err) {
      throw err instanceof Error ? err : new UnauthorizedException();
    }

    if (!user) {
      if (isPassportJwtTokenExpiredError(info)) {
        throw new UnauthorizedException('Token expired');
      }

      throw new UnauthorizedException();
    }

    return user;
  }
}
