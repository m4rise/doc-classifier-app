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
  const authenticatedUserTracker = getAuthenticatedUserTracker(req);

  if (authenticatedUserTracker) {
    return authenticatedUserTracker;
  }

  const bearerJwtSubjectTracker = getBearerJwtSubjectTracker(req);

  if (bearerJwtSubjectTracker) {
    return bearerJwtSubjectTracker;
  }

  return getIpTracker(req);
}

function getAuthenticatedUserTracker(
  req: Record<string, unknown>,
): string | null {
  const user = req.user;
  if (isRecord(user)) {
    const userId = user.userId;

    if (typeof userId === 'string' && userId.length > 0) {
      return `user:${userId}`;
    }
  }

  return null;
}

function getBearerJwtSubjectTracker(
  req: Record<string, unknown>,
): string | null {
  const authorizationHeader = getHeaderValue(req, 'authorization');

  if (!authorizationHeader) {
    return null;
  }

  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader.trim());
  const token = match?.[1];

  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload(token);

  if (isRecord(payload) && typeof payload.sub === 'string') {
    const subject = payload.sub.trim();

    if (subject.length > 0) {
      return `user:${subject}`;
    }
  }

  return null;
}

function getHeaderValue(
  req: Record<string, unknown>,
  headerName: string,
): string | null {
  const headers = req.headers;

  if (!isRecord(headers)) {
    return null;
  }

  const value = headers[headerName] ?? headers[headerName.toLowerCase()];

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }

  return null;
}

function decodeJwtPayload(token: string): unknown {
  const [, payload] = token.split('.');

  if (!payload) {
    return null;
  }

  try {
    const json = Buffer.from(payload, 'base64url').toString('utf8');
    return JSON.parse(json) as unknown;
  } catch {
    return null;
  }
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
