# ADR-ARCH-002: Backend Vertical Slice + Clean Light

## Statut

Acceptée

## Contexte

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

Organisation par slice métier (documents, auth, users...), chaque slice avec
`domain/`, `application/`, `infrastructure/`, `presentation/`.
Frontières d'import contrôlées par ESLint. Clean architecture pragmatique, sans
cérémonie hexagonale automatique.

## Décision

Organiser le backend par slices, chacune avec `domain/application/infrastructure/presentation`.

Les slices peuvent utiliser des ports applicatifs et des adapters d'infrastructure
quand une dépendance externe influence la logique métier, la sécurité ou la
testabilité (repositories, hashers, token issuers, providers externes). Le domaine
et l'application restent framework-agnostic ; NestJS, Prisma et les librairies
techniques restent dans `infrastructure/` ou `presentation/`.

Les ports ne sont pas créés automatiquement pour chaque classe. Ils sont ajoutés
quand ils protègent une règle métier, rendent un use-case testable sans framework,
ou isolent une décision technique susceptible d'évoluer.

Une intégration technique utilisée par des slices métier n'est pas automatiquement
une vertical slice. Un module d'adapters comme `llm/` peut rester limité à son
câblage et à son infrastructure. Les ports sémantiques appartiennent aux slices
qui consomment la capacité ; les adapters techniques dépendent de ces ports.

### Communication entre slices, ports et shared domain

Les slices peuvent communiquer entre elles, mais pas en important directement les
objets de domaine internes d'une autre slice (`auth/domain`, `documents/domain`,
etc.).

Quand une slice a besoin d'une capacité métier détenue par une autre slice, elle
exprime ce besoin via un port applicatif local. Par exemple, si `users` doit
demander à `auth` si un email peut devenir l'email principal d'un compte, `users`
déclare un port comme `IdentityEmailPolicyPort`, puis un adapter côté `auth` ou
infrastructure fournit l'implémentation.

Quand plusieurs slices partagent une règle métier pure, stable et indépendante
d'une slice précise, cette règle peut être extraite dans `shared/domain`. Par
exemple, un value object `Email` commun peut vivre dans
`shared/domain/value-objects/email.vo.ts` si la normalisation et la validation
d'email deviennent une règle produit transversale.

À l'inverse, une duplication locale limitée est acceptable quand la règle est
simple, peu coûteuse, et pas encore un contrat transversal explicite. Cela évite
de créer un couplage prématuré ou une abstraction artificielle.

`shared/` n'est pas un mécanisme de contournement des frontières d'import. Un
contrat n'y entre que s'il est réellement utilisé par plusieurs slices, stable,
et sans propriétaire métier naturel. Un port consommé par une seule slice reste
local à cette slice.

### Clarification — primitives partagées et stratégie de preuve

Une extraction partagée peut rester plus étroite que les contrats de ses
consommateurs. Une primitive pure de normalisation ou de validation peut vivre
dans `shared/domain`, tandis que les value objects, erreurs et décisions métier
restent dans leurs slices. De même, un predicate lié à une technologie et utilisé
par plusieurs slices peut vivre dans `shared/infrastructure`, mais la traduction
d'une erreur technique en erreur métier ou HTTP reste chez le repository, le
guard ou l'adapter propriétaire.

La présence de tests, d'un futur consommateur ou de deux formes de code seulement
similaires ne démontre pas à elle seule une abstraction partagée. L'admission dans
`shared/` repose sur des consommateurs de production actuels, une règle identique
et stable, et l'absence d'un propriétaire métier naturel.

Les preuves suivent la même frontière de responsabilité : les tests unitaires
verrouillent la primitive extraite et les décisions locales ; les tests
d'intégration verrouillent les contrats qui dépendent réellement de Passport,
Prisma/PostgreSQL ou du mapping HTTP. Une vérification d'intégration bloquée par
l'environnement est signalée puis rejouée lorsque la dépendance redevient
disponible ; elle n'est pas remplacée par des mocks ajoutés uniquement pour
contourner cette indisponibilité.

## Conséquences

- Les imports directs depuis le `domain/` d'une autre slice sont évités ; les
  dépendances inter-slices passent par des ports applicatifs ou par
  `shared/domain` quand la règle est réellement transversale.

- Maintenabilité forte : chaque slice est compréhensible indépendamment.
- Testabilité : le domaine n'a aucune dépendance externe, mockable sans framework.
- Enforcements lint requis sur les imports inter-couches pour garantir les frontières.
- Les use-cases applicatifs dépendent de ports locaux plutôt que d'adapters
  concrets lorsque cela apporte une valeur claire.
- Les helpers partagés restent mécaniques et étroits ; les décisions métier,
  persistence et HTTP demeurent testées chez leur propriétaire naturel.
- La clean architecture reste un guide de dépendances, pas une cérémonie
  systématique.
