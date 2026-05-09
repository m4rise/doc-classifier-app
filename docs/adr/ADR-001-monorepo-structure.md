# ADR-001: Monorepo Flat Structure

## Status
Accepted

## Context
Le projet doit être maintenable par un seul développeur avec CI partagée.

## Decision
Utiliser un monorepo flat avec `backend/` et `frontend/` à la racine.

## Consequences
- Simplicité de bootstrap et de déploiement.
- Coordination backend/frontend plus facile.
