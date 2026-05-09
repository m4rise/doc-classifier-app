# ADR-008: MCP Authentication via API Key

## Status
Accepted

## Context
Le serveur MCP doit rester simple pour la phase MVP.

## Decision
Protéger `/mcp` avec clé statique `X-MCP-Key` validée par un guard.

## Consequences
- Intégration rapide agents IA.
- Rotation de clé à documenter opérationnellement.
