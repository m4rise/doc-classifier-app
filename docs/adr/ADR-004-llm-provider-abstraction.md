# ADR-004: ILlmProvider Abstraction

## Status
Accepted

## Context
Le domaine ne doit pas dépendre d'un fournisseur LLM concret.

## Decision
Définir `ILlmProvider` côté domaine AI et implémenter Gemini en infrastructure.

## Consequences
- Substitution fournisseur facilitée.
- Tests métier découplés des APIs externes.
