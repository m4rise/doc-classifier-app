import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import * as Sentry from '@sentry/nestjs';
import { loadObservabilityBootstrapConfig } from './config/app.config';

const observabilityConfig = loadObservabilityBootstrapConfig();

// Sentry
Sentry.init({
  dsn: observabilityConfig.sentry.dsn,
  // RGPD: never send PII (IP, email, user agent) automatically
  sendDefaultPii: false,
  environment: observabilityConfig.sentry.environment,
  // RGPD: strip sensitive data before sending to Sentry
  beforeSend(event) {
    // Remove any user PII from events
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
      delete event.user.username;
    }
    return event;
  },
});

// OpenTelemetry to Grafana Cloud (OTLP)
// Only start the SDK when the endpoint is configured (skipped in local dev
// if the variable is absent so the app still boots without Grafana credentials).
if (observabilityConfig.otel) {
  const { endpoint, grafana, serviceName } = observabilityConfig.otel;
  const authHeader =
    'Basic ' +
    Buffer.from(`${grafana.instanceId}:${grafana.apiKey}`).toString('base64');
  const headers = { Authorization: authHeader };

  const sdk = new NodeSDK({
    serviceName,
    traceExporter: new OTLPTraceExporter({
      url: `${endpoint}/v1/traces`,
      headers,
    }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: `${endpoint}/v1/metrics`,
        headers,
      }),
      exportIntervalMillis: 15_000,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // fs instrumentation is too noisy and not actionable
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();
  process.on('SIGTERM', () => {
    void sdk.shutdown().finally(() => process.exit(0));
  });
}
