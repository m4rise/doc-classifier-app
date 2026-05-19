# ADR-OBS-001: Observability Stack

## Status

Accepted

## Context

Le système nécessite diagnostics et corrélation en production.
Trois piliers d'observabilité : logs, traces distribuées, métriques.
Le choix doit être vendor-agnostic pour éviter le lock-in sur un outil commercial
couteux.

## Options considérées

### Datadog / New Relic (all-in-one)

Excellent, tout intégré. Rejeté : tarification prohibitive (~$15–25/host/mois)
pour un projet personnel. Dépendance commerciale forte.

### Logs uniquement (console.log / nestjs-pino seul)

Simple, zéro configuration. Rejeté : pas de traces distribuées, pas de corrélation
requête-to-requête, pas de métriques. Insuffisant pour diagnostiquer des problèmes
en production.

### Stack composée vendor-agnostic (retenu)

`nestjs-pino` pour les logs structurés + `X-Request-ID` pour la corrélation +
OpenTelemetry pour les traces distribuées (vendor-agnostic) +
Sentry pour l'alerting d'erreurs + endpoint `/metrics` compatible Prometheus.

OpenTelemetry est le standard CNCF : les traces sont exportables vers n'importe
quel backend (Grafana Cloud, Jaeger, Datadog, etc.) sans changer le code.

## Decision

Adopter `nestjs-pino` + `X-Request-ID` + OpenTelemetry + Sentry + `/metrics`.

## Consequences

- Debug et RCA accélérés : chaque log est corrélé à sa trace.
- Pas de lock-in vendor : changement de backend OTLP sans modifier le code applicatif.
- Coût de configuration initial plus élevé (voir ADR-OBS-002 pour le détail d'implémentation).

## See Also

- [ADR-013](./ADR-OBS-002-opentelemetry-grafana-cloud.md) — Implementation decisions: SDK wiring,
  Grafana Cloud as OTLP backend, credential management, and WIF for CI/CD.
