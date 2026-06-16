# ADR-SEC-003: Refresh Token Revocation

## Status

Accepted

## Context

Les sessions doivent être révocables individuellement (logout, compromission de
compte). Les JWT d'accès sont stateless (15 min) ; leur révocation n'est pas
concernée. Seul le refresh token (7 jours) nécessite un mécanisme de révocation.

Les refresh tokens sont des secrets persistants. Ils ne doivent jamais être
stockés en clair.

## Options considérées

### Tokens opaques sans stockage (stateless)

Pas de révocation possible. Rejeté : un refresh token de 7 jours compromis non
révocable est un risque sécurité inacceptable.

### Blacklist en mémoire

Rapide, sans dépendance. Rejeté : perdu au redémarrage de l'instance, non partagé
entre instances Cloud Run (scale horizontal), ne fonctionne pas avec scale-to-zero.

### Blacklist Redis

Lookup O(1), partagé entre instances. Écarté : dépendance supplémentaire (Redis)
pour un volume de tokens faible (500 users). Le bénéfice de performance vs DB est
négligeable à cette échelle.

### Stockage DB avec mécanisme de révocation (retenu)

Les refresh tokens sont stockés en base avec `revokedAt`. Le refresh valide le
token en base avant d'émettre un nouvel access token.

### Refresh JWT signé, stocké hashé

Un refresh token opaque évite d'exposer un payload au client, mais impose de
retrouver le token uniquement par comparaison de hash. Avec Argon2id, comme avec
bcrypt, le hash est salé et ne peut pas être recalculé pour une recherche directe.

Le refresh token retenu est donc un JWT signé avec `JWT_REFRESH_SECRET`, expirant
après 7 jours, contenant un identifiant `jti`. Le `jti` permet de retrouver la
ligne DB candidate, puis le token Bearer complet est vérifié contre `tokenHash`.
La base ne stocke jamais le token en clair.

### Hashing Argon2id

Les refresh tokens sont hashés avec Argon2id, comme les mots de passe, afin de
rester alignés avec le standard de sécurité du projet. L'issue d'origine mentionne
bcrypt rounds 10, mais ce choix est remplacé par Argon2id pour éviter une deuxième
primitive de hashing moins robuste.

## Decision

Stocker les refresh tokens en base avec mécanisme de révocation.

Chaque token stocké contient :

- un `jti` unique, présent dans le JWT refresh signé ;
- un `tokenHash` Argon2id du token Bearer complet ;
- `expiresAt`, dérivé de la durée de vie de 7 jours ;
- `revokedAt`, renseigné lors de la rotation ou d'une révocation.

Lors d'une rotation, l'ancien token est révoqué et un nouveau couple access /
refresh est émis. Si un token déjà révoqué est réutilisé, tous les refresh tokens
du user sont révoqués.

## Consequences

- Contrôle fin des sessions : révocation individuelle ou globale par user.
- Dépendance DB lors du refresh : légère latence supplémentaire acceptable.
- Nettoyage périodique des tokens expirés nécessaire (job ou TTL Prisma).
- `JWT_REFRESH_SECRET` doit être configuré séparément de `JWT_ACCESS_SECRET`.
- Le `jti` évite de scanner les tokens du user, tout en conservant la
  vérification du hash.

## Note de concurrence

La rotation d'un refresh token doit consommer l'ancien token avec une mise à jour
conditionnelle sur `revokedAt IS NULL`. Si la ligne a déjà été révoquée par une
requête concurrente, la deuxième requête est traitée comme une réutilisation de
token et tous les refresh tokens actifs de l'utilisateur sont révoqués.
