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
