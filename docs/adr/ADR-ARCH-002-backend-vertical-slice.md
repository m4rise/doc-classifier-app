# ADR-003: Backend Vertical Slice + Clean Light

## Status
Accepted

## Context
Les responsabilités doivent rester séparées sans sur-ingénierie.
Le projet est développé seul ; l'architecture doit être maintenable et évolutive
sans imposer une cérémonie excessive.

## Options considérées

### Hexagonale complète (Ports & Adapters)
Bien adaptée aux grandes équipes et aux domaines à fort enjeu métier.
Rejetée : cérémonie élevée (interfaces pour chaque adapter, configuration d'injection
complexe), surcharge non justifiée pour un projet solo avec un seul adapter par port.

### Modules NestJS uniquement (structure framework)
Simple, natif NestJS. Rejeté : couplage croissant entre logique métier et code
d'infrastructure au fur et à mesure des features. Testabilité réduite (mocks complexes).

### Feature folders sans séparation de couches
Répertoires par feature mais sans organisation domain/application/infrastructure.
Rejeté : la dette technique s'accumule rapidement quand les responsabilités ne sont
pas explicitément séparées.

### Vertical Slice + Clean Light (retenu)
Organisation par slice métier (documents, auth, ai...), chaque slice avec
`domain/`, `application/`, `infrastructure/`, `presentation/`.
Frontières d'import contrôlées par ESLint. Clean architecture sans la cérémonie
hexagonale complète.

## Decision
Organiser le backend par slices, chacune avec `domain/application/infrastructure/presentation`.

## Consequences
- Maintenabilité forte : chaque slice est compréhensible indépendamment.
- Testabilité : le domaine n'a aucune dépendance externe, mockable sans framework.
- Enforcements lint requis sur les imports inter-couches pour garantir les frontières.
