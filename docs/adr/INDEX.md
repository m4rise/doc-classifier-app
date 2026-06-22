# ADR Index - doc-classifier-app

Architecture Decision Records organisés par catégorie.  
Format : [MADR](https://adr.github.io/madr/) - chaque ADR documente le contexte, les options considérées, la décision et ses conséquences.

---

## ARCH - Architecture fondamentale

| ADR                                                               | Titre                                                       | Statut                                              |
| ----------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------- |
| [ADR-ARCH-001](./ADR-ARCH-001-monorepo-structure.md)              | Structure monorepo plat (`backend/` + `frontend/`)          | Accepted                                            |
| [ADR-ARCH-002](./ADR-ARCH-002-backend-vertical-slice.md)          | Architecture backend - Vertical Slice + Clean Light         | Accepted                                            |
| [ADR-ARCH-003](./ADR-ARCH-003-llm-provider-abstraction.md)        | Abstraction `ILlmProvider` (interface domaine / impl infra) | Accepted                                            |
| [ADR-ARCH-004](./ADR-ARCH-004-upload-processing-state-machine.md) | Pipeline synchrone MVP - state machine upload               | Accepted (superseded partiellement par ADR-EVO-001) |
| [ADR-ARCH-005](./ADR-ARCH-005-gemini-flash-model-selection.md)    | Gemini Flash model selection for the LLM provider           | Accepted                                            |
| [ADR-ARCH-006](./ADR-ARCH-006-synchronous-processing-outcome.md)  | Synchronous processing outcome persistence                  | Accepted                                            |

---

## INFRA - Infrastructure & déploiement

| ADR                                                           | Titre                                                | Statut   |
| ------------------------------------------------------------- | ---------------------------------------------------- | -------- |
| [ADR-INFRA-001](./ADR-INFRA-001-runtime-node24.md)            | Runtime Node 24 + image distroless                   | Accepted |
| [ADR-INFRA-002](./ADR-INFRA-002-firebase-hosting-strategy.md) | Hébergement frontend - Firebase Hosting              | Accepted |
| [ADR-INFRA-003](./ADR-INFRA-003-ci-pipeline-strategy.md)      | Stratégie CI/CD - GitHub Actions (lint, test, Trivy) | Accepted |

---

## SEC - Sécurité

| ADR                                                       | Titre                                                             | Statut   |
| --------------------------------------------------------- | ----------------------------------------------------------------- | -------- |
| [ADR-SEC-001](./ADR-SEC-001-encryption-key-management.md) | Chiffrement at-rest AES-256-GCM + Secret Manager                  | Accepted |
| [ADR-SEC-002](./ADR-SEC-002-mcp-authentication.md)        | Authentification MCP - `X-MCP-Key` statique                       | Accepted |
| [ADR-SEC-003](./ADR-SEC-003-refresh-token-revocation.md)  | Révocation refresh token - stockage DB, rotation, `jti`, Argon2id | Accepted |
| [ADR-SEC-004](./ADR-SEC-004-query-safety.md)              | Sécurité requêtes SQL - `$queryRaw` + règle ESLint                | Accepted |
| [ADR-SEC-005](./ADR-SEC-005-rate-limiting.md)             | Limitation de débit des endpoints d'authentification              | Accepted |

---

## DATA - Persistance & données

| ADR                                                          | Titre                                     | Statut   |
| ------------------------------------------------------------ | ----------------------------------------- | -------- |
| [ADR-DATA-001](./ADR-DATA-001-prisma-migrations-strategy.md) | Stratégie migrations Prisma sur Cloud Run | Accepted |
| [ADR-DATA-002](./ADR-DATA-002-prisma-version-7.md)           | Adoption de Prisma 7 avec driver adapter  | Accepted |

---

## OBS - Observabilité

| ADR                                                         | Titre                                                 | Statut   |
| ----------------------------------------------------------- | ----------------------------------------------------- | -------- |
| [ADR-OBS-001](./ADR-OBS-001-observability-stack.md)         | Stack d'observabilité - nestjs-pino, Sentry, /metrics | Accepted |
| [ADR-OBS-002](./ADR-OBS-002-opentelemetry-grafana-cloud.md) | OpenTelemetry SDK wiring - NestJS vers Grafana Cloud  | Accepted |

---

## EVO - Évolutions planifiées

| ADR                                                       | Titre                                                            | Statut   |
| --------------------------------------------------------- | ---------------------------------------------------------------- | -------- |
| [ADR-EVO-001](./ADR-EVO-001-async-processing-pipeline.md) | Pipeline asynchrone - Cloud Tasks (Phase 2) vers Kafka (Phase 3) | Proposed |

---

## Légende statuts

| Statut         | Signification                                             |
| -------------- | --------------------------------------------------------- |
| **Accepted**   | Décision en vigueur dans le codebase                      |
| **Proposed**   | Décision validée conceptuellement, pas encore implémentée |
| **Superseded** | Remplacée par un ADR ultérieur                            |
| **Deprecated** | Abandonnée sans remplacement                              |
