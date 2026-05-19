# ADR-009: Refresh Token Revocation

## Status
Accepted

## Context
Les sessions doivent être révocables individuellement (logout, compromission de compte).
Les JWT d'accès sont stateless (15 min) — leur révocation n'est pas concernée.
Seul le refresh token (7 jours) nécessite un mécanisme de révocation.

## Options considérées

### Tokens opaques sans stockage (stateless)
Pas de révocation possible. Rejeté : un refresh token de 7 jours compromis
non révocable est un risque sécurité inacceptable.

### Blacklist en mémoire
Rapide, sans dépendance. Rejeté : perdu au redémarrage de l'instance, non partagé
entre instances Cloud Run (scale horizontal), ne fonctionne pas avec scale-to-zero.

### Blacklist Redis
Lookup O(1), partagé entre instances. Écarté : dépendance supplémentaire (Redis)
pour un volume de tokens faible (500 users). Le bénéfice de performance vs DB
est négligeable à cette échelle.

### Stockage DB avec mécanisme de révocation (retenu)
Les refresh tokens sont stockés en base avec un flag `revoked`. Le refresh
valide le token en base avant d'émettre un nouvel access token.

## Decision
Stocker refresh tokens en base avec mécanisme de révocation.

## Consequences
- Contrôle fin des sessions : révocation individuelle ou globale par user.
- Dépendance DB lors du refresh : légère latence supplémentaire acceptable.
- Nettoyage périodique des tokens expirés nécessaire (job ou TTL Prisma).
