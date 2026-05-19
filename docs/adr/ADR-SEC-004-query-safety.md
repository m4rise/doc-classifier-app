# ADR-012: SQL Query Safety

## Status

Accepted

## Context

Les requêtes raw sont nécessaires pour certains cas (FTS, requêtes complexes),
avec risque d'injection SQL. Prisma expose deux API : `$queryRaw` (paramétré)
et `$queryRawUnsafe` (interpolation directe, dangereux).

## Options considérées

### Éviter tout SQL raw (Prisma query builder uniquement)
Zéro risque d'injection sur les requêtes Prisma standard. Rejeté : le query
builder Prisma ne supporte pas `tsvector/tsquery` (FTS natif Postgres) ni
certaines requêtes d'agrégation avancées. Contrainte trop restrictive.

### Autoriser `$queryRawUnsafe` avec revue de code
Flexibilité maximale. Rejeté : repose sur la vigilance humaine. Un paramètre
interplé par erreur suffit à créer une vulnérabilité d'injection SQL
(OWASP A03). Non auditable automatiquement.

### `$queryRaw` uniquement avec règle ESLint (retenu)
`$queryRaw` utilise des tagged template literals : les paramètres sont
automatiquement échappés par Prisma. La règle ESLint interdit `$queryRawUnsafe`
à la compilation, pas seulement en revue.

## Decision

Interdire `$queryRawUnsafe` ; autoriser uniquement `$queryRaw` paramétré.

## Consequences

- Surface SQL injection réduite (OWASP A03).
- Règles lint obligatoires : la protection est vérifiée à chaque CI run.
- Flexibilité préservée pour les cas FTS et requêtes complexes.
