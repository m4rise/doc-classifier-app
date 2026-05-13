# ADR-007: Firebase Hosting Environment Strategy

## Status

Accepted

## Context

Le frontend Vue est une SPA statique.

## Decision

Cible principale: Firebase Hosting. Cible architecture: 3 environnements (`dev`, `staging`, `prod`).

Dans un premiers temps, en vue du MVP, un seul environnement prévu.

## Consequences

- Déploiements isolés par environnement.
- MVP possible sur 1 projet avant séparation complète.
