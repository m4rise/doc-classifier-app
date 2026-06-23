# ADR-ARCH-006 : Persistance du résultat du traitement synchrone

## Statut

Acceptée

## Date

2026-06-22

## Contexte

La story #20 complète le pipeline synchrone du MVP introduit par
ADR-ARCH-004. Deux contrats antérieurs laissent ouverts des détails
d'implémentation importants :

- La story #17 retourne une réponse HTTP 202 avec un document `PENDING` avant
  que le traitement IA soit disponible.
- Le schéma `processing_results` contient un champ `errorMessage` nullable,
  mais tous les champs d'analyse d'un succès sont obligatoires. Un échec ne
  peut donc pas être représenté sans fausses valeurs d'analyse.

Exécuter un traitement en arrière-plan après avoir retourné HTTP 202 n'est pas
fiable dans le cycle de vie d'une requête Cloud Run du MVP, car aucune file
durable ni aucun worker n'existe encore. Retourner HTTP 202 après avoir attendu
le pipeline complet serait également trompeur : la requête n'est plus seulement
acceptée pour un traitement ultérieur.

La couche application de la slice `documents` doit rester indépendante du
fournisseur. Le contrat de compatibilité `ILlmProvider` placé initialement dans
`shared` résolvait les imports entre slices, mais n'exprimait pas correctement
la propriété du port. ADR-ARCH-007 attribue désormais les ports sémantiques à la
slice consommatrice et conserve les adapters de fournisseurs dans un module
technique.

## Décision

### Cycle de vie de la requête

`POST /api/v1/documents/upload` attend l'intégralité du pipeline de traitement :

1. valider et stocker le fichier selon le flux de la story #17 ;
2. créer le document `PENDING` ;
3. le revendiquer atomiquement avec le statut `PROCESSING` ;
4. télécharger l'objet stocké via le port local `FileStorage` ;
5. l'analyser via le port local `DocumentAnalyzer` ;
6. persister atomiquement le résultat du traitement et le statut `DONE` ou
   `FAILED` du document ;
7. retourner HTTP 201 avec la représentation terminale du document.

Cette décision remplace volontairement la sémantique HTTP 202/PENDING de la
story #17 dès le déploiement de la story #20. Une analyse IA en échec retourne
tout de même le document créé avec `status: "FAILED"` et un `errorMessage`
assaini. La création de la ressource a réussi et le document reste consultable.

`GET /api/v1/documents/:id` retourne la même représentation terminale uniquement
à l'utilisateur authentifié qui possède le document. Un identifiant inexistant
ou appartenant à un autre utilisateur retourne HTTP 404 afin de ne pas révéler
l'existence de la ressource.

### Modèle du résultat de traitement

`ProcessingResult` représente exactement un résultat terminal :

- `DONE` : tous les champs d'analyse sont non nuls et `errorMessage` est nul ;
- `FAILED` : tous les champs d'analyse sont nuls et `errorMessage` contient un
  message assaini et utile pour l'exploitation.

Les colonnes d'analyse sont donc nullables en base de données. La logique
applicative garantit les deux formes valides. Les chaînes vides, les scores nuls
utilisés comme sentinelles et les erreurs brutes du fournisseur sont interdits.

La transition terminale du document et l'insertion du `ProcessingResult` ont
lieu dans une seule transaction Prisma, aussi bien en cas de succès que
d'échec. La revendication initiale `PENDING → PROCESSING` est conditionnelle et
atomique afin d'empêcher deux appels concurrents de traiter le même document.

Le drapeau `needsReview` fait partie du même résultat terminal. Il est calculé
au moment du traitement à partir du `confidenceScore` et du seuil configuré,
puis persisté dans `processing_results`. Le document racine conserve ainsi son
rôle d'agrégat d'état (`PENDING/PROCESSING/DONE/FAILED`) tandis que les données
et décisions issues de l'analyse restent propriétaires du résultat de
traitement. Un futur worker asynchrone pourra produire exactement le même
artefact persistant sans déplacer la règle métier dans la lecture HTTP.

### Composition applicative et frontière du fournisseur

`UploadDocumentUseCase` et `ProcessDocumentUseCase` restent indépendants.
`SynchronousDocumentProcessingWorkflow` les compose uniquement pour respecter
le contrat HTTP 201 actuel. Le futur worker pourra ainsi appeler
`ProcessDocumentUseCase` sans modifier l'un ou l'autre des use cases.

Les contrats canoniques `DocumentAnalyzer`, `DocumentAnalysisInput` et
`DocumentAnalysisResult` résident dans `documents/application/ports`. Le module
technique `llm/` fournit l'adapter Gemini actuel et pourra sélectionner à
l'avenir un adapter vLLM ou un autre fournisseur sans modifier le code
applicatif de `documents`. Les imports des SDK de fournisseurs restent confinés
à `llm/infrastructure`.

## Options considérées

### Retourner HTTP 202 et traiter en arrière-plan

Option rejetée pour le MVP synchrone. Sans Cloud Tasks ni autre worker durable,
un traitement attaché à la requête peut être interrompu et ne permet pas de
réessais fiables.

### Attendre le traitement tout en conservant HTTP 202/PENDING

Option rejetée, car la réponse décrirait un traitement encore en attente alors
qu'il aurait déjà atteint un état terminal.

### Stocker les échecs avec des valeurs d'analyse vides

Option rejetée, car les chaînes vides et un score de confiance nul
ressembleraient à de vraies données d'analyse et contamineraient les traitements
ultérieurs.

### Ajouter un autre champ d'erreur à `Document`

Option rejetée, car `processing_results.errorMessage` établit déjà le résultat
du traitement comme propriétaire de l'erreur. Dupliquer ce champ créerait deux
sources de vérité.

## Conséquences

- La latence d'upload inclut le téléchargement depuis le stockage et le délai
  d'expiration Gemini.
- La réponse de l'API passe de HTTP 202/PENDING à HTTP 201 avec un document
  terminal `DONE` ou `FAILED`.
- Les lignes en échec sont représentées honnêtement, sans fausses valeurs.
- Les résultats terminaux et les transitions de statut sont atomiques.
- Le flux synchrone reste volontairement temporaire ; ADR-EVO-001 définit son
  évolution asynchrone durable.
- Une future fonctionnalité de réessai devra définir si le résultat de
  traitement en relation un-à-un est remplacé ou versionné.

- La décision de revue manuelle est figée à l'instant du traitement et ne
  change pas rétroactivement si le seuil de confiance évolue plus tard.

### Limites de reprise acceptées pour le MVP

La revendication `PENDING → PROCESSING` est validée avant les appels au stockage
et à Gemini afin d'empêcher les traitements concurrents. Par conséquent, un
arrêt du processus après cette revendication ou une indisponibilité de la base
lors de la persistance du résultat terminal peut laisser un document en
`PROCESSING`. Le MVP synchrone ne possède ni bail, ni réessai automatique, ni
mécanisme de récupération des revendications obsolètes. La reprise durable
appartient à l'évolution avec file décrite par ADR-EVO-001. Jusqu'à son
implémentation, les opérateurs doivent réconcilier manuellement les lignes
obsolètes.

`FileStorage.download()` n'ajoute pas de délai d'expiration applicatif distinct
dans cette story. Les délais des SDK de stockage et de la plateforme constituent
la limite extérieure, tandis que l'appel Gemini conserve sa protection explicite
`GEMINI_TIMEOUT_MS`. Ajouter un délai annulable sur le stockage nécessiterait un
contrat d'annulation indépendant du fournisseur. Cette évolution de résilience
ne doit pas être simulée par un `Promise.race()` qui n'annule pas l'opération.

Les documents déjà en `PENDING` ou `PROCESSING` avant le déploiement de la story
#20 ne sont pas rejoués automatiquement. Ils nécessitent une réconciliation
opérationnelle ou un futur endpoint de réessai. Revendiquer silencieusement les
lignes historiques au démarrage de l'application introduirait une quantité de
travail externe non bornée et une coordination multi-instance non sécurisée.

## Références

- Story GitHub #20
- Epic GitHub #84
- ADR-ARCH-002 — Backend Vertical Slice + Clean Light
- ADR-ARCH-003 — Abstraction du fournisseur LLM
- ADR-ARCH-004 — Machine d'états du traitement synchrone du MVP
- ADR-ARCH-007 — Ports IA détenus par les slices consommatrices et module d'adapters
- ADR-EVO-001 — Pipeline asynchrone planifié
