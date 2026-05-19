# ADR-007: Firebase Hosting Environment Strategy

## Status

Accepted

## Context

Le frontend Vue est une SPA statique. Il faut un hébergement fiable, rapide à
configurer, et cohérent avec l'écosystème GCP déjà utilisé pour le backend.

## Options considérées

### Cloud Run pour le frontend
Rejeté : overkill pour une SPA statique. Cloud Run facture à l'usage CPU/mémoire,
inadapté à un contenu statique qui ne nécessite aucun compute. Complexité inutile
(Dockerfile, registry, déploiement container).

### Netlify / Vercel
Bonne DX, déploiements preview automatiques. Rejeté : introduction d'un fournisseur
hors écosystème GCP alors que le backend, le storage et les secrets sont déjà sur GCP.
Cohérence opérationnelle préférée (un seul provider cloud à gérer, une seule
facturation, IAM unifié).

### Cloud Storage + Cloud CDN
Viable techniquement. Rejeté : Firebase Hosting offre la même chose avec une DX
supérieure (CLI `firebase deploy`, rollback, canaux de prévisualisation) et reste
dans l'écosystème GCP/Google.

### Firebase Hosting (retenu)
Hébergement statique Google-natif, CDN intégré, CLI simple, rollback en un clic.

## Decision

Cible principale : Firebase Hosting. Architecture cible : 3 environnements (`dev`, `staging`, `prod`).

Dans un premier temps, en vue du MVP, un seul environnement prévu.

## Consequences

- Déploiements isolés par environnement.
- MVP possible sur 1 projet avant séparation complète.
- Pas de compute facturé pour le frontend.
