# ADR-001: Monorepo Flat Structure

## Status
Accepted

## Context
Le projet doit être maintenable par un seul développeur avec CI partagée.
Deux packages : backend NestJS et frontend Vue 3.

## Options considérées

### Nx / Turborepo
Rejeté : surcharge de tooling injustifiée pour un seul développeur avec deux packages.
Configuration complexe, courbe d'apprentissage significative, bénéfices réels
uniquement au-delà de 3–4 packages actifs.

### Deux repos séparés (backend + frontend)
Rejeté : CI partagée plus difficile à maintenir, versionning coordonné des
dépendances communes compliqué, overhead de context-switching sans gain.

### Monorepo flat (retenu)
Simplicité maximale. Un seul repo, une seule CI, coordination backend/frontend directe.
Aucun outil de monorepo requis à ce stade.

## Decision
Utiliser un monorepo flat avec `backend/` et `frontend/` à la racine.

## Consequences
- Simplicité de bootstrap et de déploiement.
- Coordination backend/frontend plus facile.
- Migration vers Nx/Turborepo possible sans réécriture si le projet grossit.
