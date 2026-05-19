# ADR-002: Runtime Node 24

## Status
Accepted

## Context
Le runtime doit être reproductible localement, en CI et sur Cloud Run.
Les divergences de version entre environnements sont une source fréquente de bugs
difficiles à reproduire.

## Options considérées

### Node 22 LTS
Stable, support garanti jusqu'en 2027. Écarté car Node 24 (Current au moment de la
décision) apporte des améliorations de performance V8 et l'API Fetch native sans polyfill.
Le risque de régression est faible sur un projet greenfield sans dépendances legacy.

### Pas de verrouillage de version
Rejeté : comportements divergents entre environnements locaux, CI et Cloud Run.
Source fréquente de bugs difficiles à reproduire.

### .nvmrc seul
Insuffisant : ne gère que Node, pas les autres outils de développement.
`mise` (anciennement `rtx`) gère l'ensemble de l'environnement depuis un seul
fichier `.mise.toml` : Node, outils CLI, langages auxiliaires.

## Decision
Verrouiller Node 24 via `.mise.toml` et `actions/setup-node`.

## Consequences
- Environnement homogène local / CI / Cloud Run.
- Réduction des bugs liés aux versions.
- Mise à jour de version centralisée dans `.mise.toml`.
