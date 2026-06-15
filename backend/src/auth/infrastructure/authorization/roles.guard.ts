import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../domain/entities/user.entity';
import { AuthenticatedRequest } from '../../presentation/authenticated-request';
import { ROLES_KEY } from '../../presentation/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (allowedRoles === undefined) {
      return true;
    }

    if (allowedRoles.length === 0) {
      return false;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user) {
      throw new UnauthorizedException();
    }

    return allowedRoles.includes(request.user.role);
  }
}
