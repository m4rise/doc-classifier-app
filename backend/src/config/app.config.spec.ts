import { parseEnvironment } from './app.config';

describe('app config', () => {
  it('applies defaults for local and test environments', () => {
    expect(parseEnvironment({ NODE_ENV: 'test' })).toMatchObject({
      app: {
        nodeEnv: 'test',
        port: 3000,
      },
      documents: {
        storage: {
          driver: 'local',
        },
        upload: {
          fileSizeLimitMb: 10,
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
      GEMINI_MODEL: ' gemini-test ',
      GEMINI_TIMEOUT_MS: ' 12000 ',
      THROTTLE_TTL: ' 30 ',
      THROTTLE_LIMIT: ' 42 ',
      CONFIDENCE_THRESHOLD: ' 0.85 ',
      FILE_SIZE_LIMIT_MB: ' 12 ',
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
        tosVersion: '2.0',
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
        GEMINI_TIMEOUT_MS: '120001',
        THROTTLE_TTL: '0',
        CONFIDENCE_THRESHOLD: '1.1',
      }),
    ).toThrow(/Invalid environment configuration/);
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
