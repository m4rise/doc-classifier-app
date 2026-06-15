import { ExecutionContext } from '@nestjs/common';
import {
  createLoginThrottleOptions,
  createRegisterThrottleOptions,
  createThrottlerModuleOptions,
  createUploadThrottleOptions,
} from './throttle.config';

describe('throttle config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses env vars for the global throttler', () => {
    process.env.THROTTLE_TTL = '30';
    process.env.THROTTLE_LIMIT = '42';

    expect(createThrottlerModuleOptions()).toMatchObject({
      errorMessage: 'Too Many Requests',
      throttlers: [{ ttl: 30000, limit: 42 }],
    });
  });

  it('uses THROTTLE_AUTH_LIMIT for login throttling', () => {
    process.env.THROTTLE_AUTH_TTL = '45';
    process.env.THROTTLE_AUTH_LIMIT = '12';

    expect(createLoginThrottleOptions()).toEqual({
      default: { ttl: 45000, limit: 12 },
    });
  });

  it('uses register defaults when env vars are absent', () => {
    delete process.env.THROTTLE_REGISTER_TTL;
    delete process.env.THROTTLE_REGISTER_LIMIT;

    expect(createRegisterThrottleOptions()).toEqual({
      default: { ttl: 60000, limit: 5 },
    });
  });

  it('falls back to defaults for partial numeric env vars', () => {
    process.env.THROTTLE_LIMIT = '42abc';
    process.env.THROTTLE_TTL = '30.5';

    expect(createThrottlerModuleOptions()).toMatchObject({
      throttlers: [{ ttl: 60000, limit: 100 }],
    });
  });

  it('falls back to defaults for TTL values beyond the Node timer limit', () => {
    process.env.THROTTLE_AUTH_TTL = '2147484';
    process.env.THROTTLE_AUTH_LIMIT = '11';

    expect(createLoginThrottleOptions()).toEqual({
      default: { ttl: 60000, limit: 11 },
    });
  });

  it('tracks upload throttling by authenticated user before falling back to IP', () => {
    const options = createUploadThrottleOptions();
    const getTracker = options.default.getTracker;

    expect(
      getTracker?.(
        { user: { userId: 'user-1' }, ip: '198.51.100.10' },
        {} as ExecutionContext,
      ),
    ).toBe('user:user-1');
    expect(getTracker?.({ ip: '198.51.100.11' }, {} as ExecutionContext)).toBe(
      'ip:198.51.100.11',
    );
  });
});
