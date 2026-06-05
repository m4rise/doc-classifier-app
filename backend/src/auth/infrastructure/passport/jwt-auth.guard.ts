import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

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
      if (isTokenExpiredError(info)) {
        throw new UnauthorizedException('Token expired');
      }

      throw new UnauthorizedException();
    }

    return user;
  }
}

function isTokenExpiredError(info: unknown): boolean {
  return (
    typeof info === 'object' &&
    info !== null &&
    'name' in info &&
    info.name === 'TokenExpiredError'
  );
}
