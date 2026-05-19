# ADR-008: MCP Authentication via API Key

## Status
Accepted

## Context
Le serveur MCP doit rester simple pour la phase MVP. Les clients sont des agents IA
machine-to-machine, pas des utilisateurs humains avec sessions.

## Options considérées

### JWT Bearer token
Rejeté : complexité disproportionnée pour des agents machine-to-machine.
Un JWT implique une émission, un refresh et une révocation. Les agents MCP
ne gèrent pas de sessions utilisateur — le gain est nul pour le coût.

### OAuth2 client credentials (M2M)
Techniquement correct pour du M2M. Rejeté pour le MVP : nécessite un serveur
d'autorisation ou une dépendance à un IdP tiers (Auth0, GCP IAM OAuth).
Identifié comme évolution V2 si besoin multi-tenant ou multi-agent.

### Clé statique X-MCP-Key (retenu)
Simple, auditable, intégrable en quelques lignes via un guard NestJS.
Acceptable pour un périmètre d'intégration contrôlé.

## Decision
Protéger `/mcp` avec clé statique `X-MCP-Key` validée par un guard.

## Consequences
- Intégration rapide agents IA.
- Risque accepté : clé statique — rotation à documenter opérationnellement
  (nouvelle clé dans Secret Manager + redéploiement).
- Évolution V2 : OAuth2 client credentials si besoin multi-tenant.
