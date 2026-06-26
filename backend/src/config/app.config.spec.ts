import { parseEnvironment } from './app.config';

describe('app config', () => {
  it('applies defaults for local and test environments', () => {
    expect(parseEnvironment({ NODE_ENV: 'test' })).toMatchObject({
      app: {
        nodeEnv: 'test',
        port: 3000,
      },
      auth: {
        jwtAccessTokenTtlSeconds: 900,
        jwtRefreshTokenTtlSeconds: 604800,
        tosVersion: '1.0',
        argon2: {
          timeCost: 3,
          memoryCostKiB: 19456,
          parallelism: 1,
        },
      },
      database: {
        pool: {
          max: 2,
          connectionTimeoutMs: 10000,
        },
      },
      documents: {
        storage: {
          driver: 'local',
        },
        upload: {
          fileSizeLimitMb: 10,
        },
        download: {
          signedUrlTtlSeconds: 900,
        },
        list: {
          defaultLimit: 20,
          maxLimit: 100,
        },
        classification: {
          confidenceThreshold: 0.7,
        },
      },
      llm: {
        gemini: {
          model: 'gemini-3.5-flash',
          timeoutMs: 8000,
        },
      },
      rateLimit: {
        global: {
          ttlSeconds: 60,
          limit: 100,
        },
      },
    });
  });

  it('trims strings and coerces bounded numeric values', () => {
    const config = parseEnvironment({
      NODE_ENV: ' staging ',
      PORT: ' 3001 ',
      DATABASE_URL: ' postgresql://user:pass@host:5432/db ',
      JWT_ACCESS_SECRET: ' access-secret ',
      JWT_REFRESH_SECRET: ' refresh-secret ',
      AES_ENCRYPTION_KEY:
        ' 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef ',
      GEMINI_API_KEY: ' gemini-key ',
      MCP_API_KEY: ' mcp-key ',
      SENTRY_DSN: ' https://example@sentry.io/1 ',
      GRAFANA_INSTANCE_ID: ' grafana-instance ',
      GRAFANA_API_KEY: ' grafana-key ',
      FILE_STORAGE_DRIVER: ' GCS ',
      GCS_BUCKET_NAME: ' bucket ',
      GCS_PROJECT_ID: ' project ',
      JWT_ACCESS_TOKEN_TTL_SECONDS: ' 1200 ',
      JWT_REFRESH_TOKEN_TTL_SECONDS: ' 86400 ',
      ARGON2_TIME_COST: ' 4 ',
      ARGON2_MEMORY_COST_KIB: ' 32768 ',
      ARGON2_PARALLELISM: ' 2 ',
      PRISMA_POOL_MAX: ' 3 ',
      PRISMA_POOL_CONNECTION_TIMEOUT_MS: ' 15000 ',
      GEMINI_MODEL: ' gemini-test ',
      GEMINI_TIMEOUT_MS: ' 12000 ',
      THROTTLE_TTL: ' 30 ',
      THROTTLE_LIMIT: ' 42 ',
      CONFIDENCE_THRESHOLD: ' 0.85 ',
      FILE_SIZE_LIMIT_MB: ' 12 ',
      DOCUMENT_DOWNLOAD_URL_TTL_SECONDS: ' 300 ',
      DOCUMENT_LIST_DEFAULT_LIMIT: ' 25 ',
      DOCUMENT_LIST_MAX_LIMIT: ' 80 ',
      TOS_VERSION: ' 2.0 ',
    });

    expect(config).toMatchObject({
      app: {
        nodeEnv: 'staging',
        port: 3001,
      },
      auth: {
        jwtAccessSecret: 'access-secret',
        jwtRefreshSecret: 'refresh-secret',
        jwtAccessTokenTtlSeconds: 1200,
        jwtRefreshTokenTtlSeconds: 86400,
        tosVersion: '2.0',
        argon2: {
          timeCost: 4,
          memoryCostKiB: 32768,
          parallelism: 2,
        },
      },
      database: {
        pool: {
          max: 3,
          connectionTimeoutMs: 15000,
        },
      },
      documents: {
        storage: {
          driver: 'gcs',
          gcs: {
            bucketName: 'bucket',
            projectId: 'project',
          },
        },
        upload: {
          fileSizeLimitMb: 12,
        },
        download: {
          signedUrlTtlSeconds: 300,
        },
        list: {
          defaultLimit: 25,
          maxLimit: 80,
        },
        classification: {
          confidenceThreshold: 0.85,
        },
      },
      llm: {
        gemini: {
          apiKey: 'gemini-key',
          model: 'gemini-test',
          timeoutMs: 12000,
        },
      },
      rateLimit: {
        global: {
          ttlSeconds: 30,
          limit: 42,
        },
      },
    });
  });

  it('fails fast for invalid bounded values', () => {
    expect(() =>
      parseEnvironment({
        PORT: '70000',
        ARGON2_TIME_COST: '1',
        PRISMA_POOL_MAX: '11',
        GEMINI_TIMEOUT_MS: '120001',
        THROTTLE_TTL: '0',
        CONFIDENCE_THRESHOLD: '1.1',
        DOCUMENT_DOWNLOAD_URL_TTL_SECONDS: '901',
      }),
    ).toThrow(/Invalid environment configuration/);
  });

  it('requires the default document list limit to fit within the configured max', () => {
    expect(() =>
      parseEnvironment({
        DOCUMENT_LIST_DEFAULT_LIMIT: '50',
        DOCUMENT_LIST_MAX_LIMIT: '25',
      }),
    ).toThrow(
      /DOCUMENT_LIST_DEFAULT_LIMIT must be less than or equal to DOCUMENT_LIST_MAX_LIMIT/,
    );
  });

  it('requires deployed-environment secrets', () => {
    expect(() =>
      parseEnvironment({
        NODE_ENV: 'production',
      }),
    ).toThrow(/DATABASE_URL is required in deployed environments/);
  });

  it('requires GCS settings when GCS storage is selected', () => {
    expect(() =>
      parseEnvironment({
        FILE_STORAGE_DRIVER: 'gcs',
      }),
    ).toThrow(/GCS_BUCKET_NAME is required when FILE_STORAGE_DRIVER=gcs/);
  });
});
