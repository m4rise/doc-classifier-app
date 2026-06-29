import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const guard = new JwtAuthGuard();

  it('maps an expired token without a user to the existing message', () => {
    expect(() =>
      guard.handleRequest(null, false, { name: 'TokenExpiredError' }),
    ).toThrow(new UnauthorizedException('Token expired'));
  });

  it('preserves error precedence over expiration information', () => {
    const error = new Error('passport failure');

    expect(() =>
      guard.handleRequest(error, false, { name: 'TokenExpiredError' }),
    ).toThrow(error);
  });

  it('ignores expiration information when Passport returned a user', () => {
    const user = { id: 'user-1' };

    expect(guard.handleRequest(null, user, { name: 'TokenExpiredError' })).toBe(
      user,
    );
  });
});
