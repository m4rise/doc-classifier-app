# ADR-ARCH-007 : Ports IA détenus par les slices consommatrices et module d'adapters

## Statut

Acceptée

## Date

2026-06-23

## Contexte

L'architecture initiale représentait `ai/` comme une vertical slice métier
détenant `ILlmProvider` et le use case de classification des documents. La story
#20 a établi que l'orchestration de l'analyse documentaire et sa machine d'états
appartiennent à la capacité métier `documents`. Après ce déplacement, `ai/` ne
contenait plus ni use case métier ni modèle de domaine ; il ne regroupait que le
câblage NestJS et l'adapter du SDK Gemini.

Le déplacement de `ILlmProvider`, `IFileStorage` et des erreurs du fournisseur
dans `shared/` évitait les imports entre slices, mais rendait `shared/`
propriétaire de contrats utilisés par une seule slice métier. Il exposait
également un vocabulaire LLM technique à l'application `documents` au lieu
d'exprimer la capacité métier dont elle a besoin.

Gemini pourra prendre en charge d'autres capacités à l'avenir, notamment des
opérations MCP. Le projet doit aussi rester capable de sélectionner un autre
fournisseur, comme un déploiement vLLM local. Cette portabilité ne doit pas
nécessiter un port générique partagé dont la forme serait dictée par le premier
use case.

## Décision

### Les slices métier détiennent leurs ports sémantiques

La slice métier consommatrice détient chaque port applicatif et l'exprime dans
son propre langage métier. Pour la story #20, `documents/application` détient :

- `DocumentAnalyzer`, avec une entrée documentaire et un résultat d'analyse
  indépendants du fournisseur ;
- `FileStorage`, car le stockage documentaire est actuellement utilisé
  uniquement par `documents` ;
- les erreurs applicatives que le use case de traitement interprète
  explicitement.

L'application `documents` n'importe ni Gemini, ni SDK LLM, ni contrat technique
de fournisseur.

### `llm/` est un module technique d'adapters, pas une vertical slice

Le module racine `llm/` constitue la frontière de composition des fournisseurs.
Il contient le câblage NestJS ainsi que les adapters, prompts, schémas et
configurations propres à chaque fournisseur. Il ne possède pas de répertoires
`domain/` ou `application/` artificiels tant qu'il ne détient aucune capacité
indépendante réelle dans ces couches.

`GeminiDocumentAnalyzer` implémente le port `DocumentAnalyzer` détenu par la
slice consommatrice. Un futur adapter vLLM implémentera le même port. La sélection
du fournisseur restera confinée à la composition et à la configuration de
`LlmModule`. Les imports des SDK Google restent confinés à
`llm/infrastructure/gemini`.

Si une autre slice a besoin de la même capacité d'analyse documentaire, elle
doit consommer la capacité applicative de `documents` plutôt qu'appeler Gemini
directement. Si elle requiert une capacité IA réellement différente, cette
slice définit son propre port sémantique et `llm/` peut fournir un autre adapter.
Un port LLM générique partagé entre slices ne sera introduit que lorsque
plusieurs slices consommatrices auront démontré l'existence d'une abstraction commune
stable.

### L'upload et le traitement restent des use cases indépendants

`UploadDocumentUseCase` valide et stocke le fichier, puis crée un document
`PENDING`. `ProcessDocumentUseCase` détient la machine d'états
`PENDING → PROCESSING → DONE | FAILED` ainsi que l'analyse.

Le `SynchronousDocumentProcessingWorkflow` temporaire compose les deux use cases
afin de respecter le contrat du MVP défini par ADR-ARCH-006 : une réponse HTTP
201 contenant un état terminal. Il s'agit d'un workflow applicatif explicite,
pas d'un use case métier fusionné. L'évolution asynchrone pourra supprimer ce
workflow, placer une commande durable `ProcessDocument` dans une file, puis
appeler `ProcessDocumentUseCase` depuis un worker sans modifier les deux use
cases.

Aucun événement de domaine en mémoire n'est utilisé pour la composition
synchrone, car la requête doit attendre et retourner le résultat du traitement.
Attendre un handler d'événement masquerait le même couplage temporel sans
apporter de durabilité. Les commandes et événements durables restent du ressort
d'ADR-EVO-001.

### Règle d'admission dans `shared/`

Du code n'appartient à `shared/` que s'il est utilisé par plusieurs slices,
stable et sans propriétaire métier naturel. Le câblage transversal de la base
de données, la limitation de débit et la corrélation des requêtes restent dans
`shared/`. Les ports propres à une slice consommatrice, les erreurs de
fournisseur, les
prompts et les types de résultats d'analyse n'y appartiennent pas.

## Options considérées

### Conserver `ai/` comme vertical slice

Option rejetée, car cette slice ne détenait plus ni use case métier ni modèle de
domaine. Conserver des couches DDD vides aurait donné à l'arborescence une
architecture qui n'existe pas réellement.

### Conserver un `ILlmProvider` générique dans `shared/interfaces`

Option rejetée, car son contrat `analyzeDocument` est propre à `documents` et ne
constitue pas encore une abstraction partagée démontrée. Cette option ferait
également dépendre l'application métier d'un vocabulaire technique de
fournisseur.

### Déclencher le traitement par un événement de domaine en mémoire

Option rejetée pour le MVP synchrone, car HTTP 201 exige un résultat terminal et
EventEmitter ne fournit ni livraison durable ni réessai. Cette option ne pourra
être reconsidérée qu'avec le pipeline asynchrone durable.

## Conséquences

- Le sens des dépendances métier est explicite : les adapters de fournisseurs
  dépendent des ports détenus par les slices consommatrices, jamais l'inverse.
- Gemini peut être remplacé sans modifier les use cases documentaires ni la
  persistance.
- Les futurs travaux MCP peuvent réutiliser les capacités documentaires ou
  définir un port sémantique distinct sans transformer `shared/` en couche
  d'intégration générique.
- `shared/interfaces` et `shared/errors` sont supprimés, car leurs contrats
  actuels ont un propriétaire unique et clairement identifié.
- Le module de fournisseurs pourra implémenter plusieurs ports détenus par des
  slices consommatrices. Il s'agit volontairement d'une composition d'adapters,
  pas d'un bounded context métier.
- Le workflow synchrone reste temporaire et constitue le principal point de
  composition à remplacer lors de l'implémentation d'ADR-EVO-001. La présentation
  HTTP et le câblage évolueront également pour retourner HTTP 202 et distribuer
  la commande durable.

## Références

- Story GitHub #20
- Epic GitHub #84
- ADR-ARCH-002 — Backend Vertical Slice + Clean Light
- ADR-ARCH-003 — Abstraction du fournisseur LLM
- ADR-ARCH-006 — Persistance du résultat du traitement synchrone
- ADR-EVO-001 — Pipeline asynchrone planifié
