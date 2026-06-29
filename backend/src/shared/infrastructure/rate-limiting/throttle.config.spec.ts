import { ExecutionContext } from '@nestjs/common';
import type { Resolvable } from '@nestjs/throttler';
import { parseEnvironment } from '../../../config/app.config';
import {
  configureRateLimitPolicy,
  createAuthSessionThrottleOptions,
  createLoginThrottleOptions,
  createRegisterThrottleOptions,
  createThrottlerModuleOptions,
  createUploadThrottleOptions,
} from './throttle.config';

describe('throttle config', () => {
  beforeEach(() => {
    configureRateLimitPolicy(parseEnvironment({ NODE_ENV: 'test' }).rateLimit);
  });

  it('uses typed config for the global throttler', () => {
    const rateLimit = parseEnvironment({
      THROTTLE_TTL: '30',
      THROTTLE_LIMIT: '42',
    }).rateLimit;

    expect(createThrottlerModuleOptions(rateLimit)).toMatchObject({
      errorMessage: 'Too Many Requests',
      throttlers: [{ ttl: 30000, limit: 42 }],
    });
  });

  it('uses typed config for login throttling', async () => {
    configureRateLimitPolicy(
      parseEnvironment({
        THROTTLE_AUTH_TTL: '45',
        THROTTLE_AUTH_LIMIT: '12',
      }).rateLimit,
    );

    const options = createLoginThrottleOptions();

    await expect(resolveThrottleValue(options.default.ttl)).resolves.toBe(
      45000,
    );
    await expect(resolveThrottleValue(options.default.limit)).resolves.toBe(12);
  });

  it('uses register defaults when config values are absent', async () => {
    const options = createRegisterThrottleOptions();

    await expect(resolveThrottleValue(options.default.ttl)).resolves.toBe(
      60000,
    );
    await expect(resolveThrottleValue(options.default.limit)).resolves.toBe(5);
  });

  it('resolves decorator values from the latest configured policy', async () => {
    const options = createAuthSessionThrottleOptions();

    configureRateLimitPolicy(
      parseEnvironment({
        THROTTLE_AUTH_SESSION_TTL: '8',
        THROTTLE_AUTH_SESSION_LIMIT: '7',
      }).rateLimit,
    );

    await expect(resolveThrottleValue(options.default.ttl)).resolves.toBe(8000);
    await expect(resolveThrottleValue(options.default.limit)).resolves.toBe(7);
  });

  it('tracks login throttling by IP', () => {
    const options = createLoginThrottleOptions();
    const getTracker = options.default.getTracker;

    expect(
      getTracker?.(
        { body: { email: ' User@Example.COM ' }, ip: '198.51.100.12' },
        {} as ExecutionContext,
      ),
    ).toBe('ip:198.51.100.12');
    expect(
      getTracker?.({ body: {}, ip: '198.51.100.13' }, {} as ExecutionContext),
    ).toBe('ip:198.51.100.13');
  });

  it('tracks authenticated auth-session throttling by user before falling back to IP', () => {
    const options = createAuthSessionThrottleOptions();
    const getTracker = options.default.getTracker;

    expect(
      getTracker?.(
        { user: { userId: 'user-1' }, ip: '198.51.100.14' },
        {} as ExecutionContext,
      ),
    ).toBe('user:user-1');
    expect(getTracker?.({ ip: '198.51.100.15' }, {} as ExecutionContext)).toBe(
      'ip:198.51.100.15',
    );
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

  it('tracks upload throttling by bearer JWT subject when req.user is not populated yet', () => {
    const options = createUploadThrottleOptions();
    const getTracker = options.default.getTracker;
    const token = createUnsignedJwt({ sub: 'user-from-token' });

    expect(
      getTracker?.(
        {
          headers: { authorization: `Bearer ${token}` },
          ip: '198.51.100.16',
        },
        {} as ExecutionContext,
      ),
    ).toBe('user:user-from-token');
  });
});

async function resolveThrottleValue(
  value: Resolvable<number>,
): Promise<number> {
  return typeof value === 'function'
    ? await value({} as ExecutionContext)
    : value;
}

function createUnsignedJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: 'none', typ: 'JWT' }),
  ).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');

  return `${header}.${body}.signature`;
}
