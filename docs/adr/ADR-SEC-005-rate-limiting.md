# ADR-SEC-005: Limitation de débit des endpoints d'authentification

## Status

Accepted

## Contexte

Les endpoints d'authentification sont exposés avant que l'utilisateur soit
considéré comme fiable. Ils doivent résister au credential stuffing, aux
tentatives de brute-force sur le login, et aux boucles accidentelles côté client
sans ajouter une infrastructure disproportionnée pour le MVP.

Le backend NestJS s'exécute derrière Cloud Run. Cloud Run fournit le hop proxy
public ; l'application doit donc extraire l'IP de manière compatible proxy sans
faire confiance à une chaîne `X-Forwarded-For` non bornée.

## Options considérées

### Aucun throttling côté serveur

Rejeté. Les contrôles côté client ne protègent pas les endpoints publics et ne
bloquent pas le trafic scripté.

### Limiteur custom stocké en base

Rejeté pour le MVP. Cette option permettrait des compteurs distribués, mais elle
ajoute schéma, nettoyage et complexité transactionnelle avant que le trafic
attendu ne le justifie.

### Limiteur Redis

Différé. Redis fournirait des compteurs partagés entre instances, mais ajoute
une dépendance opérationnelle qui n'est pas encore justifiée à l'échelle actuelle.

### `@nestjs/throttler` en mémoire, avec overrides auth explicites

Retenu. Le module est simple, idiomatique pour NestJS, testable, et suffisant
pour le profil de trafic MVP. Les limites sont configurables par variables
d'environnement pour que la production puisse durcir ou assouplir la politique
sans changement de code.

## Décision

Utiliser `@nestjs/throttler` comme guard global.

Le backend définit :

- une limite globale par défaut pour tous les endpoints ;
- une limite plus stricte pour l'inscription ;
- une limite plus stricte pour le login, indexée par email normalisé quand il
  est disponible, avec fallback IP ;
- une limite dédiée aux endpoints d'authentification déjà authentifiés
  (`logout`, `refresh`, `me`), indexée par utilisateur authentifié quand il est
  disponible, avec fallback IP ;
- une future limite upload indexée par utilisateur authentifié avant fallback IP.

L'application fait confiance à exactement un hop proxy avec
`app.set('trust proxy', 1)`. Ce choix correspond mieux au modèle de déploiement
Cloud Run qu'une confiance illimitée dans toute la chaîne proxy.

## Conséquences

- Les tentatives de brute-force login sont limitées même si l'attaquant fait
  tourner les IPs pour un même email cible.
- Les inscriptions et les logins mal formés restent protégés par fallback IP.
- Les endpoints auth authentifiés sont protégés contre les boucles client et les
  tempêtes de refresh token.
- Les compteurs en mémoire sont propres à chaque instance. Un backend Redis
  pourra remplacer le stockage par défaut si le scaling horizontal impose des
  compteurs inter-instances.
- L'ingress Cloud Run doit rester le point d'entrée public fiable. Si le service
  est exposé derrière d'autres proxies, `trust proxy` devra être réévalué.
