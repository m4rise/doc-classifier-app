import type {
  Resolvable,
  ThrottlerGetTrackerFunction,
  ThrottlerModuleOptions,
} from '@nestjs/throttler';
import { parseEnvironment } from '../../../config/app.config';
import type { AppConfiguration } from '../../../config/app.config';

type NamedThrottleOptions = Record<
  'default',
  {
    getTracker?: ThrottlerGetTrackerFunction;
    limit: Resolvable<number>;
    ttl: Resolvable<number>;
  }
>;

type RateLimitConfig = AppConfiguration['rateLimit'];

let rateLimitConfig = parseEnvironment({ NODE_ENV: 'test' }).rateLimit;

export function configureRateLimitPolicy(config: RateLimitConfig): void {
  rateLimitConfig = config;
}

export function createThrottlerModuleOptions(
  config = rateLimitConfig,
): ThrottlerModuleOptions {
  configureRateLimitPolicy(config);

  return {
    errorMessage: 'Too Many Requests',
    throttlers: [
      {
        ttl: secondsToMilliseconds(config.global.ttlSeconds),
        limit: config.global.limit,
      },
    ],
  };
}

export function createLoginThrottleOptions(): NamedThrottleOptions {
  return createNamedThrottleOptions(
    () => rateLimitConfig.auth.loginLimit,
    () => rateLimitConfig.auth.ttlSeconds,
    getIpTracker,
  );
}

export function createRegisterThrottleOptions(): NamedThrottleOptions {
  return createNamedThrottleOptions(
    () => rateLimitConfig.auth.registerLimit,
    () => rateLimitConfig.auth.registerTtlSeconds,
  );
}

export function createAuthSessionThrottleOptions(): NamedThrottleOptions {
  return createNamedThrottleOptions(
    () => rateLimitConfig.auth.sessionLimit,
    () => rateLimitConfig.auth.sessionTtlSeconds,
    getAuthenticatedUserOrIpTracker,
  );
}

export function createUploadThrottleOptions(): NamedThrottleOptions {
  return createNamedThrottleOptions(
    () => rateLimitConfig.upload.limit,
    () => rateLimitConfig.upload.ttlSeconds,
    getAuthenticatedUserOrIpTracker,
  );
}

function createNamedThrottleOptions(
  getLimit: () => number,
  getTtlSeconds: () => number,
  getTracker?: ThrottlerGetTrackerFunction,
): NamedThrottleOptions {
  return {
    default: {
      ...(getTracker ? { getTracker } : {}),
      limit: () => getLimit(),
      ttl: () => secondsToMilliseconds(getTtlSeconds()),
    },
  };
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
