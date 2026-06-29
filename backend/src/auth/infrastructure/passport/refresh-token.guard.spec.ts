import { UnauthorizedException } from '@nestjs/common';
import { RefreshTokenGuard } from './refresh-token.guard';

describe('RefreshTokenGuard', () => {
  const guard = new RefreshTokenGuard();

  it('maps expiration information to the existing refresh message', () => {
    expect(() =>
      guard.handleRequest(null, false, { name: 'TokenExpiredError' }),
    ).toThrow(new UnauthorizedException('Refresh token expired'));
  });

  it('preserves expiration information precedence over Passport errors', () => {
    expect(() =>
      guard.handleRequest(new Error('passport failure'), false, {
        name: 'TokenExpiredError',
      }),
    ).toThrow(new UnauthorizedException('Refresh token expired'));
  });

  it('keeps the invalid refresh token fallback for unknown information', () => {
    expect(() =>
      guard.handleRequest(null, false, { name: 'OtherError' }),
    ).toThrow(new UnauthorizedException('Invalid refresh token'));
  });
});
