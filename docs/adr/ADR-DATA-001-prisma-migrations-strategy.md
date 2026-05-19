# ADR-011: Prisma Zero-Downtime Migration Pattern

## Status
Accepted

## Context
Les migrations doivent limiter les risques en production.
Cloud Run n'a pas de fenêtre de maintenance : les migrations se font sur une base
en production avec des connexions actives.

## Options considérées

### Ajout de colonne NOT NULL immédiat
Rapide en développement. Rejeté en production : si la table contient des
lignes existantes, la migration échoue ou requiert un backfill instantané qui
bloque la table entière (à fort volume).

### Squash et reapplication
Simplifie l'historique. Rejeté : risque élevé si le schéma prod diverge de
l'historique recomposé. Perte de la traçabilité des évolutions.

### Migration raw SQL manuelle
Contrôle total. Rejeté : perte de la type-safety de Prisma, overhead de
maintenance, risque d'erreur humaine sur les scripts SQL.

### Nullable-first puis contrainte stricte après backfill (retenu)
Étape 1 : ajout de la colonne nullable (migration sans risque).
Étape 2 : backfill des données existantes.
Étape 3 : migration pour ajouter la contrainte NOT NULL.

## Decision
Appliquer le pattern nullable-first puis contrainte stricte après backfill.

## Consequences
- Réduction du risque de migration bloquante.
- Discipline de migration requise : chaque ajout de contrainte = au moins 2 migrations.
- Applicable systématiquement même en pré-production pour prendre l'habitude.
