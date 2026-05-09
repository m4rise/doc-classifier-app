# ADR-005: AES-256-GCM Key Management

## Status
Accepted

## Context
Les données sensibles doivent être chiffrées at-rest.

## Decision
Utiliser AES-256-GCM, clé injectée via GCP Secret Manager sur Cloud Run.

## Consequences
- Conformité sécurité renforcée.
- Gestion de secrets externalisée.
