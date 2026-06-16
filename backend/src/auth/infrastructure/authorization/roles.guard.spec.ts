import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../../application/authenticated-user';
import { RolesGuard } from './roles.guard';

function createHttpContext(
  user?: Partial<AuthenticatedUser>,
): ExecutionContext {
  return {
    getClass: jest.fn(),
    getHandler: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('denies USER access to an ADMIN route', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createHttpContext({ role: 'USER' }))).toBe(false);
  });

  it('allows ADMIN access to an ADMIN route', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createHttpContext({ role: 'ADMIN' }))).toBe(true);
  });

  it('allows access when the authenticated role matches one of multiple allowed roles', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN', 'USER']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createHttpContext({ role: 'USER' }))).toBe(true);
  });

  it('allows routes without role metadata', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createHttpContext({ role: 'USER' }))).toBe(true);
  });

  it('denies routes with explicitly empty role metadata', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createHttpContext({ role: 'USER' }))).toBe(false);
  });

  it('throws UnauthorizedException when a protected route has no authenticated user', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(createHttpContext())).toThrow(
      UnauthorizedException,
    );
  });
});
