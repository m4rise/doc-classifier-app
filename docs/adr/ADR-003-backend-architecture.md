# ADR-003: Backend Vertical Slice + Clean Light

## Status
Accepted

## Context
Les responsabilités doivent rester séparées sans sur-ingénierie.

## Decision
Organiser le backend par slices, chacune avec `domain/application/infrastructure/presentation`.

## Consequences
- Maintenabilité forte.
- Enforcements lint requis sur les imports inter-couches.
