import { ConfigService } from '@nestjs/config';
import { AppConfiguration, AppEnvironment } from '../../../config/app.config';

const TEST_JWT_ACCESS_SECRET = 'test-only-jwt-access-secret';
const TEST_JWT_REFRESH_SECRET = 'test-only-jwt-refresh-secret';

export function getJwtAccessSecret(
  configService: ConfigService<AppConfiguration, true>,
): string {
  const app = configService.getOrThrow('app', { infer: true });
  const auth = configService.getOrThrow('auth', { infer: true });

  return requireJwtSecret(
    auth.jwtAccessSecret,
    app.nodeEnv,
    'JWT_ACCESS_SECRET',
    TEST_JWT_ACCESS_SECRET,
  );
}

export function getJwtRefreshSecret(
  configService: ConfigService<AppConfiguration, true>,
): string {
  const app = configService.getOrThrow('app', { infer: true });
  const auth = configService.getOrThrow('auth', { infer: true });

  return requireJwtSecret(
    auth.jwtRefreshSecret,
    app.nodeEnv,
    'JWT_REFRESH_SECRET',
    TEST_JWT_REFRESH_SECRET,
  );
}

function requireJwtSecret(
  value: string | undefined,
  nodeEnv: AppEnvironment,
  key: string,
  testFallback: string,
): string {
  if (value) {
    return value;
  }

  if (nodeEnv === 'test') {
    return testFallback;
  }

  throw new Error(`${key} is required`);
}
