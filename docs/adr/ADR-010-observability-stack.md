# ADR-010: Observability Stack

## Status

Accepted

## Context

Le système nécessite diagnostics et corrélation en production.

## Decision

Adopter `nestjs-pino` + `X-Request-ID` + OpenTelemetry + Sentry + `/metrics`.

## Consequences

- Debug et RCA accélérés.
- Coût de configuration initial plus élevé.

## See Also

- [ADR-013](./ADR-013-opentelemetry-grafana-cloud.md) — Implementation decisions: SDK wiring,
  Grafana Cloud as OTLP backend, credential management, and WIF for CI/CD.
