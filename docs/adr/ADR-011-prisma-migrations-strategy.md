# ADR-011: Prisma Zero-Downtime Migration Pattern

## Status
Accepted

## Context
Les migrations doivent limiter les risques en production.

## Decision
Appliquer le pattern nullable-first puis contrainte stricte après backfill.

## Consequences
- Réduction du risque de migration bloquante.
- Discipline de migration requise.
