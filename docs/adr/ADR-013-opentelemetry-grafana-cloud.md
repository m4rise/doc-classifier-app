# ADR-013: OpenTelemetry SDK Wiring — NestJS

## Status

Accepted

## Context

ADR-010 decided to adopt OpenTelemetry. This ADR records the concrete implementation
decisions visible in `backend/src/instrument.ts` and `backend/src/main.ts`.

## Decisions

### 1. `instrument.ts` is the first import in `main.ts`

```ts
import "./instrument"; // must be first
```

OTel auto-instrumentation works by monkey-patching Node.js modules at require-time.
If the SDK starts after `AppModule` (and its dependencies) are already loaded, those
modules are not patched. Moving `import './instrument'` to the top of `main.ts`
guarantees the SDK is running before any NestJS module is required.

### 2. Sentry and OTel are both initialised in `instrument.ts`

Both observability systems share one boot entry point, so load order is explicit and
there is no risk of one being skipped.

### 3. Conditional SDK startup

The OTel SDK only starts when `OTEL_EXPORTER_OTLP_ENDPOINT` is set:

```ts
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
if (otlpEndpoint) { ... }
```

The application boots normally in local development without Grafana credentials and
without any network errors at startup.

### 4. OTLP HTTP exporters — traces and metrics

- Traces: `OTLPTraceExporter` → `${endpoint}/v1/traces`
- Metrics: `OTLPMetricExporter` → `${endpoint}/v1/metrics`, exported every 15 s

### 5. Basic auth header built from `GRAFANA_INSTANCE_ID` and `GRAFANA_API_KEY`

```ts
"Basic " + Buffer.from(`${instanceId}:${apiKey}`).toString("base64");
```

Passed as the `Authorization` header on every exporter request.

### 6. `fs` instrumentation disabled

`@opentelemetry/instrumentation-fs` is explicitly disabled — the comment in code
states it is too noisy and not actionable for this application.

### 7. Graceful shutdown on `SIGTERM`

```ts
process.on("SIGTERM", () => sdk.shutdown().finally(() => process.exit(0)));
```

Ensures in-flight spans and metrics are flushed before the process exits (e.g. Cloud Run
shutdown).

## Consequences

- Auto-instrumentation (HTTP, DB drivers) works correctly because the SDK starts before
  any application module is loaded.
- Local development requires no Grafana credentials.
- Misconfiguration in prod/staging fails fast (missing `GRAFANA_INSTANCE_ID` or
  `GRAFANA_API_KEY` produces an invalid auth header, not a silent no-op).
