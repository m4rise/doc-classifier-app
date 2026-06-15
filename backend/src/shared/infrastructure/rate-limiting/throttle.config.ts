import {
  ThrottlerGetTrackerFunction,
  ThrottlerModuleOptions,
} from '@nestjs/throttler';

type NamedThrottleOptions = Record<
  'default',
  {
    getTracker?: ThrottlerGetTrackerFunction;
    limit: number;
    ttl: number;
  }
>;

const DEFAULT_GLOBAL_TTL_SECONDS = 60;
const DEFAULT_GLOBAL_LIMIT = 100;
const DEFAULT_AUTH_TTL_SECONDS = 60;
const DEFAULT_LOGIN_LIMIT = 10;
const DEFAULT_REGISTER_LIMIT = 5;
const DEFAULT_AUTH_SESSION_LIMIT = 60;
const DEFAULT_UPLOAD_LIMIT = 10;
const MAX_TIMEOUT_SECONDS = 2_147_483;

export function createThrottlerModuleOptions(): ThrottlerModuleOptions {
  return {
    errorMessage: 'Too Many Requests',
    throttlers: [
      {
        ttl: secondsToMilliseconds(
          readPositiveIntegerEnv(
            'THROTTLE_TTL',
            DEFAULT_GLOBAL_TTL_SECONDS,
            MAX_TIMEOUT_SECONDS,
          ),
        ),
        limit: readPositiveIntegerEnv('THROTTLE_LIMIT', DEFAULT_GLOBAL_LIMIT),
      },
    ],
  };
}

export function createLoginThrottleOptions(): NamedThrottleOptions {
  return createNamedThrottleOptions(
    'THROTTLE_AUTH_LIMIT',
    DEFAULT_LOGIN_LIMIT,
    'THROTTLE_AUTH_TTL',
    DEFAULT_AUTH_TTL_SECONDS,
    getIpTracker,
  );
}

export function createRegisterThrottleOptions(): NamedThrottleOptions {
  return createNamedThrottleOptions(
    'THROTTLE_REGISTER_LIMIT',
    DEFAULT_REGISTER_LIMIT,
    'THROTTLE_REGISTER_TTL',
    DEFAULT_AUTH_TTL_SECONDS,
  );
}

export function createAuthSessionThrottleOptions(): NamedThrottleOptions {
  return createNamedThrottleOptions(
    'THROTTLE_AUTH_SESSION_LIMIT',
    DEFAULT_AUTH_SESSION_LIMIT,
    'THROTTLE_AUTH_SESSION_TTL',
    DEFAULT_AUTH_TTL_SECONDS,
    getAuthenticatedUserOrIpTracker,
  );
}

export function createUploadThrottleOptions(): NamedThrottleOptions {
  return createNamedThrottleOptions(
    'THROTTLE_UPLOAD_LIMIT',
    DEFAULT_UPLOAD_LIMIT,
    'THROTTLE_UPLOAD_TTL',
    DEFAULT_AUTH_TTL_SECONDS,
    getAuthenticatedUserOrIpTracker,
  );
}

function createNamedThrottleOptions(
  limitEnvName: string,
  defaultLimit: number,
  ttlEnvName: string,
  defaultTtlSeconds: number,
  getTracker?: ThrottlerGetTrackerFunction,
): NamedThrottleOptions {
  return {
    default: {
      ...(getTracker ? { getTracker } : {}),
      limit: readPositiveIntegerEnv(limitEnvName, defaultLimit),
      ttl: secondsToMilliseconds(
        readPositiveIntegerEnv(
          ttlEnvName,
          defaultTtlSeconds,
          MAX_TIMEOUT_SECONDS,
        ),
      ),
    },
  };
}

function readPositiveIntegerEnv(
  name: string,
  defaultValue: number,
  maxValue = Number.MAX_SAFE_INTEGER,
): number {
  const value = process.env[name];

  if (!value) {
    return defaultValue;
  }

  const trimmedValue = value.trim();

  if (!/^\d+$/.test(trimmedValue)) {
    return defaultValue;
  }

  const parsed = Number(trimmedValue);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= maxValue
    ? parsed
    : defaultValue;
}

function secondsToMilliseconds(seconds: number): number {
  return seconds * 1000;
}

function getAuthenticatedUserOrIpTracker(req: Record<string, unknown>): string {
  const user = req.user;

  if (isRecord(user)) {
    const userId = user.userId;

    if (typeof userId === 'string' && userId.length > 0) {
      return `user:${userId}`;
    }
  }

  return getIpTracker(req);
}

function getIpTracker(req: Record<string, unknown>): string {
  const ip = req.ip;

  if (typeof ip === 'string' && ip.length > 0) {
    return `ip:${ip}`;
  }

  if (typeof ip === 'number' && Number.isFinite(ip)) {
    return `ip:${ip}`;
  }

  return 'ip:unknown';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
