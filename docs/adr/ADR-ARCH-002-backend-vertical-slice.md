# ADR-ARCH-002: Backend Vertical Slice + Clean Light

## Status

Accepted

## Context

Les responsabilités doivent rester séparées sans sur-ingénierie.
Le projet est développé seul ; l'architecture doit être maintenable et évolutive
sans imposer une cérémonie excessive.

Depuis les premières stories auth, le backend évolue vers une clean architecture
pragmatique : vrais objets de domaine, value objects, use-cases framework-agnostic,
ports applicatifs pour les dépendances qui influencent les règles métier ou la
testabilité, et adapters NestJS/Prisma en infrastructure/presentation.

## Options considérées

### Hexagonale complète (Ports & Adapters)

Bien adaptée aux grandes équipes et aux domaines à fort enjeu métier.
Rejetée : cérémonie élevée si elle est appliquée systématiquement, configuration
d'injection complexe, surcharge non justifiée pour chaque détail technique.

### Modules NestJS uniquement (structure framework)

Simple, natif NestJS. Rejetée : couplage croissant entre logique métier et code
d'infrastructure au fur et à mesure des features. Testabilité réduite.

### Feature folders sans séparation de couches

Répertoires par feature mais sans organisation domain/application/infrastructure.
Rejetée : la dette technique s'accumule rapidement quand les responsabilités ne
sont pas explicitement séparées.

### Vertical Slice + Clean Light (retenu)

Organisation par slice métier (documents, auth, ai...), chaque slice avec
`domain/`, `application/`, `infrastructure/`, `presentation/`.
Frontières d'import contrôlées par ESLint. Clean architecture pragmatique, sans
cérémonie hexagonale automatique.

## Decision

Organiser le backend par slices, chacune avec `domain/application/infrastructure/presentation`.

Les slices peuvent utiliser des ports applicatifs et des adapters d'infrastructure
quand une dépendance externe influence la logique métier, la sécurité ou la
testabilité (repositories, hashers, token issuers, providers externes). Le domaine
et l'application restent framework-agnostic ; NestJS, Prisma et les librairies
techniques restent dans `infrastructure/` ou `presentation/`.

Les ports ne sont pas créés automatiquement pour chaque classe. Ils sont ajoutés
quand ils protègent une règle métier, rendent un use-case testable sans framework,
ou isolent une décision technique susceptible d'évoluer.

## Consequences

- Maintenabilité forte : chaque slice est compréhensible indépendamment.
- Testabilité : le domaine n'a aucune dépendance externe, mockable sans framework.
- Enforcements lint requis sur les imports inter-couches pour garantir les frontières.
- Les use-cases applicatifs dépendent de ports locaux plutôt que d'adapters
  concrets lorsque cela apporte une valeur claire.
- La clean architecture reste un guide de dépendances, pas une cérémonie
  systématique.
