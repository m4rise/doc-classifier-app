import { z } from 'zod';

/**
 * Central backend configuration contract.
 *
 * Precedence is owned by `@nestjs/config`:
 *
 * 1. Existing `process.env` values, such as Cloud Run, CI, shell exports, or
 *    values injected by the test bootstrap, have highest priority.
 * 2. Values from the default `.env` file fill keys that are not already present
 *    in `process.env`.
 * 3. Zod defaults below apply only when a key is absent or blank after trimming.
 * 4. Invalid explicit values fail startup instead of silently falling back.
 *
 * This file is intentionally broad: it models the current backend env
 * inventory so future PRs can migrate feature-level resolvers into typed config
 * without inventing new ad hoc parsers.
 */

/**
 * Runtime defaults used when an env key is absent or blank.
 *
 * These defaults mirror the existing `.env.example`, deployment workflow, and
 * resolver behavior. They are not a license to add new policy constants here:
 * Group B of the drift remediation should move feature runtime policies behind
 * this config contract deliberately.
 */
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

/**
 * Typed shape consumed through `ConfigService<AppConfiguration, true>`.
 *
 * The shape is grouped by backend concern rather than by raw env key so
 * consumers can ask for `app`, `rateLimit`, `documents.storage`, etc. and avoid
 * scattering env-key knowledge through modules.
 */
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

/**
 * NODE_ENV accepts the environments used by local dev, CI, staging, and
 * production. Blank values are treated as absent so the local default applies.
 */
const appEnvironmentSchema = z.preprocess(
  cleanString,
  z
    .enum(['development', 'test', 'staging', 'production'])
    .default('development'),
);

/**
 * FILE_STORAGE_DRIVER is normalized case-insensitively because existing
 * resolver tests accepted values such as `GCS` and `local`.
 */
const fileStorageDriverSchema = z.preprocess(
  (value) => {
    const cleaned = cleanString(value);
    return typeof cleaned === 'string' ? cleaned.toLowerCase() : cleaned;
  },
  z.enum(['local', 'gcs']).default('local'),
);

/**
 * Flat env-key schema used as the single validation gate.
 *
 * Zod receives the merged raw environment from Nest's `validate` hook. Numeric
 * fields are coerced only after trimming; malformed or out-of-range explicit
 * values fail validation. Optional secrets stay optional for local/test but
 * become required in deployed environments below.
 */
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

/**
 * Config factory registered with `ConfigModule.forRoot({ load: [...] })`.
 *
 * Nest first validates the merged `.env` + `process.env` input, then populates
 * missing `process.env` keys from that validated result. This factory reuses
 * the same parser against `process.env` so the injected config object and the
 * validation gate cannot drift apart.
 */
export function loadAppConfig(): AppConfiguration {
  return toAppConfiguration(parseEnvironmentVariables(process.env));
}

/**
 * Validation hook registered with `ConfigModule.forRoot({ validate })`.
 *
 * Returning the parsed flat object lets Nest expose the validated raw env values
 * while throwing a readable startup error when any rule fails.
 */
export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  return parseEnvironmentVariables(environment);
}

/**
 * Test-facing parser that bypasses Nest and returns the typed grouped config.
 */
export function parseEnvironment(
  environment: Record<string, unknown>,
): AppConfiguration {
  return toAppConfiguration(parseEnvironmentVariables(environment));
}

/**
 * Parse and format Zod validation errors consistently for startup and tests.
 */
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

/**
 * Converts validated env keys into the grouped application contract.
 */
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

/**
 * Positive integer env parser with optional lower and upper bounds.
 */
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

/**
 * Numeric env parser for bounded decimal values such as confidence thresholds.
 */
function numericEnv(defaultValue: number, minValue: number, maxValue: number) {
  return z.preprocess(
    cleanString,
    z.coerce.number().min(minValue).max(maxValue).default(defaultValue),
  );
}

/**
 * Required-after-default string parser for non-secret configurable values.
 */
function trimmedStringWithDefault(defaultValue: string) {
  return z.preprocess(cleanString, z.string().min(1).default(defaultValue));
}

/**
 * Optional string parser for values that may be absent locally or in tests.
 */
function optionalTrimmedString() {
  return z.preprocess(cleanString, z.string().min(1).optional());
}

/**
 * Normalizes whitespace-only env values to absence.
 */
function cleanString(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

/**
 * Adds a custom Zod issue when an environment-specific invariant is missing.
 */
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

/**
 * Keeps startup errors compact while still naming every invalid env key.
 */
function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
      return `${path}: ${issue.message}`;
    })
    .join('; ');
}
