# ADR-009: Refresh Token Revocation

## Status
Accepted

## Context
Les sessions doivent être révocables individuellement.

## Decision
Stocker refresh tokens en base avec mécanisme de révocation.

## Consequences
- Contrôle fin des sessions.
- Dépendance DB lors du refresh.
