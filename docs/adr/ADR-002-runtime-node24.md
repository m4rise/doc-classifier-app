# ADR-002: Runtime Node 24

## Status
Accepted

## Context
Le runtime doit être reproductible localement, CI et cloud.

## Decision
Verrouiller Node 24 via `.mise.toml` et `actions/setup-node`.

## Consequences
- Environnement homogène.
- Réduction des bugs liés aux versions.
