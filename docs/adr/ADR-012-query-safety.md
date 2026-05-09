# ADR-012: SQL Query Safety

## Status
Accepted

## Context
Les requêtes raw sont nécessaires pour certains cas (FTS), avec risque d'injection.

## Decision
Interdire `$queryRawUnsafe`; autoriser uniquement `$queryRaw` paramétré.

## Consequences
- Surface SQL injection réduite.
- Règles lint obligatoires.
