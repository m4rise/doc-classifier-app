import { z } from 'zod';

const DEFAULT_PORT = 3000;
const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';
const DEFAULT_GEMINI_TIMEOUT_MS = 8_000;
const MAX_GEMINI_TIMEOUT_MS = 120_000;
const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;
const DEFAULT_FILE_SIZE_LIMIT_MB = 10;
const DEFAULT_TOS_VERSION = '1.0';
const DEFAULT_GLOBAL_THROTTLE_TTL_SECONDS = 60;
const DEFAULT_GLOBAL_THROTTLE_LIMIT = 100;
const DEFAULT_AUTH_THROTTLE_TTL_SECONDS = 60;
const DEFAULT_LOGIN_THROTTLE_LIMIT = 10;
const DEFAULT_AUTH_SESSION_THROTTLE_LIMIT = 60;
const DEFAULT_REGISTER_THROTTLE_LIMIT = 5;
const DEFAULT_UPLOAD_THROTTLE_LIMIT = 10;
const MAX_THROTTLE_TTL_SECONDS = 2_147_483;
const DEFAULT_OTEL_ENDPOINT =
  'https://otlp-gateway-prod-gb-south-1.grafana.net/otlp';
const DEFAULT_OTEL_SERVICE_NAME = 'doc-classifier-app-backend';
const DEFAULT_OTEL_RESOURCE_ATTRIBUTES =
  'service.namespace=production,service.version=1.0.0,deployment.environment=production';

export type AppEnvironment = 'development' | 'test' | 'staging' | 'production';
export type FileStorageDriver = 'local' | 'gcs';

export interface AppConfiguration {
  app: {
    nodeEnv: AppEnvironment;
    port: number;
  };
  auth: {
    jwtAccessSecret?: string;
    jwtRefreshSecret?: string;
    tosVersion: string;
  };
  database: {
    url?: string;
  };
  documents: {
    storage: {
      driver: FileStorageDriver;
      gcs: {
        bucketName?: string;
        projectId?: string;
      };
      localUploadDir?: string;
    };
    upload: {
      fileSizeLimitMb: number;
    };
    classification: {
      confidenceThreshold: number;
    };
  };
  llm: {
    gemini: {
      apiKey?: string;
      model: string;
      timeoutMs: number;
    };
  };
  rateLimit: {
    global: {
      ttlSeconds: number;
      limit: number;
    };
    auth: {
      ttlSeconds: number;
      loginLimit: number;
      sessionTtlSeconds: number;
      sessionLimit: number;
      registerTtlSeconds: number;
      registerLimit: number;
    };
    upload: {
      ttlSeconds: number;
      limit: number;
    };
  };
  security: {
    aesEncryptionKey?: string;
    mcpApiKey?: string;
  };
  observability: {
    sentryDsn?: string;
    otel: {
      endpoint: string;
      serviceName: string;
      resourceAttributes: string;
      tracesExporter: string;
      metricsExporter: string;
      logsExporter: string;
    };
    grafana: {
      instanceId?: string;
      apiKey?: string;
    };
  };
}

const appEnvironmentSchema = z.preprocess(
  cleanString,
  z
    .enum(['development', 'test', 'staging', 'production'])
    .default('development'),
);

const fileStorageDriverSchema = z.preprocess(
  (value) => {
    const cleaned = cleanString(value);
    return typeof cleaned === 'string' ? cleaned.toLowerCase() : cleaned;
  },
  z.enum(['local', 'gcs']).default('local'),
);

const environmentSchema = z
  .object({
    NODE_ENV: appEnvironmentSchema,
    PORT: integerEnv(DEFAULT_PORT, 1, 65_535),
    DATABASE_URL: optionalTrimmedString(),
    JWT_ACCESS_SECRET: optionalTrimmedString(),
    JWT_REFRESH_SECRET: optionalTrimmedString(),
    AES_ENCRYPTION_KEY: optionalTrimmedString(),
    GCS_BUCKET_NAME: optionalTrimmedString(),
    GCS_PROJECT_ID: optionalTrimmedString(),
    FILE_STORAGE_DRIVER: fileStorageDriverSchema,
    LOCAL_UPLOAD_DIR: optionalTrimmedString(),
    GEMINI_API_KEY: optionalTrimmedString(),
    GEMINI_MODEL: trimmedStringWithDefault(DEFAULT_GEMINI_MODEL),
    GEMINI_TIMEOUT_MS: integerEnv(
      DEFAULT_GEMINI_TIMEOUT_MS,
      1,
      MAX_GEMINI_TIMEOUT_MS,
    ),
    MCP_API_KEY: optionalTrimmedString(),
    SENTRY_DSN: optionalTrimmedString(),
    OTEL_EXPORTER_OTLP_ENDPOINT: trimmedStringWithDefault(
      DEFAULT_OTEL_ENDPOINT,
    ),
    GRAFANA_INSTANCE_ID: optionalTrimmedString(),
    GRAFANA_API_KEY: optionalTrimmedString(),
    OTEL_SERVICE_NAME: trimmedStringWithDefault(DEFAULT_OTEL_SERVICE_NAME),
    OTEL_RESOURCE_ATTRIBUTES: trimmedStringWithDefault(
      DEFAULT_OTEL_RESOURCE_ATTRIBUTES,
    ),
    OTEL_TRACES_EXPORTER: trimmedStringWithDefault('otlp'),
    OTEL_METRICS_EXPORTER: trimmedStringWithDefault('otlp'),
    OTEL_LOGS_EXPORTER: trimmedStringWithDefault('otlp'),
    THROTTLE_TTL: integerEnv(
      DEFAULT_GLOBAL_THROTTLE_TTL_SECONDS,
      1,
      MAX_THROTTLE_TTL_SECONDS,
    ),
    THROTTLE_LIMIT: integerEnv(DEFAULT_GLOBAL_THROTTLE_LIMIT),
    THROTTLE_AUTH_TTL: integerEnv(
      DEFAULT_AUTH_THROTTLE_TTL_SECONDS,
      1,
      MAX_THROTTLE_TTL_SECONDS,
    ),
    THROTTLE_AUTH_LIMIT: integerEnv(DEFAULT_LOGIN_THROTTLE_LIMIT),
    THROTTLE_AUTH_SESSION_TTL: integerEnv(
      DEFAULT_AUTH_THROTTLE_TTL_SECONDS,
      1,
      MAX_THROTTLE_TTL_SECONDS,
    ),
    THROTTLE_AUTH_SESSION_LIMIT: integerEnv(
      DEFAULT_AUTH_SESSION_THROTTLE_LIMIT,
    ),
    THROTTLE_REGISTER_TTL: integerEnv(
      DEFAULT_AUTH_THROTTLE_TTL_SECONDS,
      1,
      MAX_THROTTLE_TTL_SECONDS,
    ),
    THROTTLE_REGISTER_LIMIT: integerEnv(DEFAULT_REGISTER_THROTTLE_LIMIT),
    THROTTLE_UPLOAD_TTL: integerEnv(
      DEFAULT_AUTH_THROTTLE_TTL_SECONDS,
      1,
      MAX_THROTTLE_TTL_SECONDS,
    ),
    THROTTLE_UPLOAD_LIMIT: integerEnv(DEFAULT_UPLOAD_THROTTLE_LIMIT),
    CONFIDENCE_THRESHOLD: numericEnv(DEFAULT_CONFIDENCE_THRESHOLD, 0, 1),
    FILE_SIZE_LIMIT_MB: integerEnv(DEFAULT_FILE_SIZE_LIMIT_MB),
    TOS_VERSION: trimmedStringWithDefault(DEFAULT_TOS_VERSION),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' || env.NODE_ENV === 'staging') {
      requireConfigured(ctx, env.DATABASE_URL, 'DATABASE_URL');
      requireConfigured(ctx, env.JWT_ACCESS_SECRET, 'JWT_ACCESS_SECRET');
      requireConfigured(ctx, env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET');
      requireConfigured(ctx, env.AES_ENCRYPTION_KEY, 'AES_ENCRYPTION_KEY');
      requireConfigured(ctx, env.GEMINI_API_KEY, 'GEMINI_API_KEY');
      requireConfigured(ctx, env.MCP_API_KEY, 'MCP_API_KEY');
      requireConfigured(ctx, env.SENTRY_DSN, 'SENTRY_DSN');
      requireConfigured(ctx, env.GRAFANA_INSTANCE_ID, 'GRAFANA_INSTANCE_ID');
      requireConfigured(ctx, env.GRAFANA_API_KEY, 'GRAFANA_API_KEY');
    }

    if (env.FILE_STORAGE_DRIVER === 'gcs') {
      requireConfigured(
        ctx,
        env.GCS_BUCKET_NAME,
        'GCS_BUCKET_NAME',
        'GCS_BUCKET_NAME is required when FILE_STORAGE_DRIVER=gcs',
      );
      requireConfigured(
        ctx,
        env.GCS_PROJECT_ID,
        'GCS_PROJECT_ID',
        'GCS_PROJECT_ID is required when FILE_STORAGE_DRIVER=gcs',
      );
    }

    if (
      env.AES_ENCRYPTION_KEY &&
      !/^[0-9a-fA-F]{64}$/.test(env.AES_ENCRYPTION_KEY)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['AES_ENCRYPTION_KEY'],
        message: 'AES_ENCRYPTION_KEY must be exactly 64 hex characters',
      });
    }
  });

type EnvironmentVariables = z.infer<typeof environmentSchema>;

export function loadAppConfig(): AppConfiguration {
  return toAppConfiguration(parseEnvironmentVariables(process.env));
}

export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  return parseEnvironmentVariables(environment);
}

export function parseEnvironment(
  environment: Record<string, unknown>,
): AppConfiguration {
  return toAppConfiguration(parseEnvironmentVariables(environment));
}

function parseEnvironmentVariables(
  environment: Record<string, unknown>,
): EnvironmentVariables {
  const result = environmentSchema.safeParse(environment);

  if (!result.success) {
    throw new Error(
      `Invalid environment configuration: ${formatZodIssues(result.error)}`,
    );
  }

  return result.data;
}

function toAppConfiguration(env: EnvironmentVariables): AppConfiguration {
  return {
    app: {
      nodeEnv: env.NODE_ENV,
      port: env.PORT,
    },
    auth: {
      jwtAccessSecret: env.JWT_ACCESS_SECRET,
      jwtRefreshSecret: env.JWT_REFRESH_SECRET,
      tosVersion: env.TOS_VERSION,
    },
    database: {
      url: env.DATABASE_URL,
    },
    documents: {
      storage: {
        driver: env.FILE_STORAGE_DRIVER,
        gcs: {
          bucketName: env.GCS_BUCKET_NAME,
          projectId: env.GCS_PROJECT_ID,
        },
        localUploadDir: env.LOCAL_UPLOAD_DIR,
      },
      upload: {
        fileSizeLimitMb: env.FILE_SIZE_LIMIT_MB,
      },
      classification: {
        confidenceThreshold: env.CONFIDENCE_THRESHOLD,
      },
    },
    llm: {
      gemini: {
        apiKey: env.GEMINI_API_KEY,
        model: env.GEMINI_MODEL,
        timeoutMs: env.GEMINI_TIMEOUT_MS,
      },
    },
    rateLimit: {
      global: {
        ttlSeconds: env.THROTTLE_TTL,
        limit: env.THROTTLE_LIMIT,
      },
      auth: {
        ttlSeconds: env.THROTTLE_AUTH_TTL,
        loginLimit: env.THROTTLE_AUTH_LIMIT,
        sessionTtlSeconds: env.THROTTLE_AUTH_SESSION_TTL,
        sessionLimit: env.THROTTLE_AUTH_SESSION_LIMIT,
        registerTtlSeconds: env.THROTTLE_REGISTER_TTL,
        registerLimit: env.THROTTLE_REGISTER_LIMIT,
      },
      upload: {
        ttlSeconds: env.THROTTLE_UPLOAD_TTL,
        limit: env.THROTTLE_UPLOAD_LIMIT,
      },
    },
    security: {
      aesEncryptionKey: env.AES_ENCRYPTION_KEY,
      mcpApiKey: env.MCP_API_KEY,
    },
    observability: {
      sentryDsn: env.SENTRY_DSN,
      otel: {
        endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
        serviceName: env.OTEL_SERVICE_NAME,
        resourceAttributes: env.OTEL_RESOURCE_ATTRIBUTES,
        tracesExporter: env.OTEL_TRACES_EXPORTER,
        metricsExporter: env.OTEL_METRICS_EXPORTER,
        logsExporter: env.OTEL_LOGS_EXPORTER,
      },
      grafana: {
        instanceId: env.GRAFANA_INSTANCE_ID,
        apiKey: env.GRAFANA_API_KEY,
      },
    },
  };
}

function integerEnv(
  defaultValue: number,
  minValue = 1,
  maxValue = Number.MAX_SAFE_INTEGER,
) {
  return z.preprocess(
    cleanString,
    z.coerce.number().int().min(minValue).max(maxValue).default(defaultValue),
  );
}

function numericEnv(defaultValue: number, minValue: number, maxValue: number) {
  return z.preprocess(
    cleanString,
    z.coerce.number().min(minValue).max(maxValue).default(defaultValue),
  );
}

function trimmedStringWithDefault(defaultValue: string) {
  return z.preprocess(cleanString, z.string().min(1).default(defaultValue));
}

function optionalTrimmedString() {
  return z.preprocess(cleanString, z.string().min(1).optional());
}

function cleanString(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function requireConfigured(
  ctx: z.RefinementCtx,
  value: string | undefined,
  key: string,
  message = `${key} is required in deployed environments`,
): void {
  if (value) {
    return;
  }

  ctx.addIssue({
    code: 'custom',
    path: [key],
    message,
  });
}

function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
      return `${path}: ${issue.message}`;
    })
    .join('; ');
}
