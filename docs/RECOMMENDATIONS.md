# Recommandations d'amélioration — fullstack-lab

_Document de référence généré le 2026-05-19. Mis à jour le 2026-05-19 après analyse approfondie des ADRs, de l'architecture, et du positionnement marché._

---

## Récapitulatif priorisé

| Priorité | Item                                           | Statut             | Effort estimé | Impact carrière      |
| -------- | ---------------------------------------------- | ------------------ | ------------- | -------------------- |
| 🔴 1     | **A1** — Pipeline async Phase 2 (Cloud Tasks)  | À faire            | 2–3 jours     | Maximum              |
| 🔴 2     | **ADR-EVO-001** — async pipeline               | ✅ Créé (Proposed) | —             | Maximum              |
| 🔴 3     | **D1** — Analyse choix cloud + stratégie async | ✅ Documenté ici   | —             | Maximum              |
| 🟠 4     | **C2** — README orienté recruteur              | À faire            | 2–3h          | Très élevé           |
| 🟠 5     | **B5** — ADR-015 stratégie FTS                 | À faire            | 1h            | Élevé                |
| 🟠 6     | **B1–B4** — Enrichir ADRs fins                 | ✅ Fait            | —             | Élevé                |
| 🟡 7     | **A2** — Rate limiting                         | À faire            | 2–3h          | Moyen                |
| 🟡 8     | **B8** — ADR-018 rate limiting                 | À faire            | 30min         | Moyen                |
| 🟡 9     | **B6** — ADR-016 error boundaries              | À faire            | 1h            | Moyen                |
| 🟢 10    | **C1** — Frontière MVP / V2                    | À faire            | 30min         | Faible (mais propre) |

---

## Catégorie A — Additions architecturales

### A1. Pipeline asynchrone — Phase 2 Cloud Tasks, Phase 3 Kafka _(en cours de planification)_

> ADR-ARCH-004 documente le choix sync comme intentionnel et borné au MVP.  
> ADR-EVO-001 a été créé avec statut **Proposed** — il documente les deux phases d'évolution.

**Problème**

Le pipeline IA est synchrone dans le cycle de vie d'une requête HTTP. L'endpoint upload bloque jusqu'à la fin du traitement Gemini. Conséquences :

- La connexion HTTP reste ouverte pendant le traitement (jusqu'à 3s selon les NFRs).
- Aucun mécanisme de retry automatique si Gemini timeout ou renvoie une erreur réseau.
- Sur Cloud Run avec des uploads concurrents, les instances bloquent sur des I/O longues.
- Aucune observabilité sur la profondeur de file — parce qu'il n'y a pas de file.
- Les patterns distribués ciblés (idempotence, DLQ, retry backoff) ne peuvent pas être démontrés.

**Stratégie en deux phases — documentée dans ADR-EVO-001**

| Phase       | Solution                | Quand                                        | Ce que ça démontre                                                          |
| ----------- | ----------------------- | -------------------------------------------- | --------------------------------------------------------------------------- |
| **Phase 2** | Cloud Tasks (GCP natif) | Maintenant (après MVP)                       | Découplage HTTP, retry/DLQ, queue-based load leveling, 202 Accepted pattern |
| **Phase 3** | Confluent Cloud Kafka   | Si : multi-consumer, replay, volume, fan-out | Topics, partitions, consumer groups, offsets, at-least-once delivery        |

> **Pourquoi Cloud Tasks en premier** : YAGNI. Cloud Tasks résout tous les problèmes concrets du MVP (connexion bloquante, retry, observabilité de la file) sans ajouter d'infrastructure. Kafka est la réponse à des besoins qui n'existent pas encore. BullMQ rejeté : mêmes limites que Cloud Tasks mais ajoute une dépendance Redis.
>
> **Argument en entretien** : _"J'ai fait un choix proportionné — Cloud Tasks répond au problème réel. J'ai documenté le chemin vers Kafka dans l'ADR-EVO-001 avec les triggers précis qui le justifieraient : multi-consumer, replay, volume. Ce n'est pas de la procrastination, c'est du YAGNI appliqué à l'architecture."_
>
> **Vocabulaire débloqué par Cloud Tasks seul** : queue-based load leveling, retry avec backoff, DLQ, 202 Accepted, idempotence, découplage producteur/consommateur, observabilité de la profondeur de file.

**Architecture cible**

```
POST /documents/upload
  → DB status: PENDING (transaction)
  → Enqueue Cloud Tasks task { jobId, documentId, gcsPath, userId }
  → HTTP 202 Accepted { jobId, status: "PENDING" }

Cloud Tasks worker endpoint: POST /internal/process-document
  → Vérification idempotence (jobId en DB)
  → Upload GCS
  → Appel Gemini
  → DB status: DONE | FAILED

Dead Letter Queue: /internal/process-document-dlq
  → Après 3 retries Cloud Tasks
  → DB status: FAILED avec failureReason
  → Alerting Sentry + log structuré corrélé
```

**Détails d'implémentation Phase 2 (Cloud Tasks)**

- Cloud Tasks HTTP target = Cloud Run endpoint `/internal/process-document` (authentifié par OIDC)
- **Idempotence** : `jobId` vérification en DB avant traitement (évite re-processing si retry Cloud Tasks)
- **Retry** : config Cloud Tasks — 3 tentatives, backoff exponentiel configurable
- **DLQ** : endpoint `/internal/process-document-dlq` + DB status `FAILED` avec `failureReason`
- `GET /documents/:id` expose le `status` courant (PENDING / PROCESSING / DONE / FAILED) — le client poll
- Zéro infrastructure supplémentaire : Cloud Tasks est GCP-natif, même tenant que Cloud Run

---

### A2. Rate limiting _(mentionné dans les NFRs, absent du code et des ADRs)_

**Problème**

Les NFRs mentionnent "rate limiting configurable" mais il n'y a ni ADR ni implémentation documentée. La surface d'attaque par brute force et abus du pipeline IA n'est pas couverte.

**Recommandation**

Utiliser `@nestjs/throttler` avec configuration par route :

| Route                    | Limite      | Raison                                    |
| ------------------------ | ----------- | ----------------------------------------- |
| `POST /auth/login`       | 5 req/min   | Protection brute force                    |
| `POST /auth/register`    | 5 req/min   | Protection spam création de comptes       |
| `POST /documents/upload` | 10 req/min  | Protection abus pipeline IA (coût Gemini) |
| API générale             | 100 req/min | Protection générale                       |

> Note : `@nestjs/throttler` est in-memory par défaut. Acceptable pour Cloud Run scale-to-zero (instances éphémères, pas d'état partagé entre instances). Si le scaling horizontal devient un enjeu, migrer vers le store Redis de BullMQ (si A1 BullMQ est retenu) ou Cloud Armor au niveau infra.

---

## Catégorie B — Qualité documentaire

### B1. Enrichir ADR-001 (Monorepo flat)

**Section à ajouter** : `## Options considérées`

```markdown
## Options considérées

### Nx / Turborepo

Rejeté : surcharge de tooling injustifiée pour un seul développeur avec deux packages.
Configuration complexe, courbe d'apprentissage, bénéfices réels uniquement au-delà de 3–4 packages.

### Deux repos séparés (backend + frontend)

Rejeté : CI partagée plus difficile à maintenir, versionning coordonné des dépendances communes
compliqué, overhead de context-switching.

### Décision retenue : monorepo flat

Simplicité maximale. Un seul repo, une seule CI, coordination backend/frontend directe.
Aucun outil de monorepo requis à ce stade.
```

---

### B2. Enrichir ADR-002 (Node 24)

**Section à ajouter** : `## Options considérées`

```markdown
## Options considérées

### Node 22 LTS

Stable, support garanti jusqu'en 2027. Rejeté car Node 24 (current au moment de la décision)
apporte des améliorations de performance V8 et de l'API Fetch native sans polyfill.
Le risque de régression est faible sur un projet greenfield.

### Pas de verrouillage de version

Rejeté : comportements divergents entre environnements locaux, CI et Cloud Run.
Source fréquente de bugs difficiles à reproduire.

### .nvmrc seul

Insuffisant : ne gère que Node, pas les autres outils de développement.
`mise` (anciennement `rtx`) gère l'ensemble de l'environnement depuis un seul fichier `.mise.toml`.
```

---

### B3. Enrichir ADR-007 (Firebase Hosting)

**Section à ajouter** : `## Options considérées`

```markdown
## Options considérées

### Cloud Run pour le frontend

Rejeté : overkill pour une SPA statique. Cloud Run facture à l'usage CPU/mémoire,
inadapté à un contenu statique qui ne nécessite aucun compute.

### Netlify / Vercel

Rejeté : introduction d'un fournisseur hors écosystème GCP alors que le backend, le storage
et les secrets sont déjà sur GCP. Cohérence opérationnelle préférée.

### Cloud Storage + Cloud CDN

Viable techniquement mais Firebase Hosting offre la même chose avec une DX supérieure
(CLI, rollback, canal de déploiement) et reste dans l'écosystème GCP/Google.
```

---

### B4. Enrichir ADR-008 (MCP API Key)

**Section à ajouter** : `## Options considérées`

```markdown
## Options considérées

### JWT Bearer token

Rejeté : complexité disproportionnée pour des agents machine-to-machine.
Les agents MCP ne gèrent pas de sessions utilisateur — un JWT implique une émission,
un refresh et une révocation sans bénéfice réel dans ce contexte.

### OAuth2 client credentials

Techniquement correct pour du M2M. Rejeté pour le MVP : implémentation lourde
(serveur d'autorisation ou dépendance à un IdP tiers), délai significatif.
Identifié comme évolution V2 si besoin multi-tenant.

### Risque accepté

La clé statique doit être rotée opérationnellement (procédure à documenter).
Acceptable en MVP sur un périmètre d'intégration contrôlé.
```

---

### B5. ADR manquant : stratégie de recherche full-text _(à créer : ADR-015)_

**Problème**

FR20–FR22 (full-text search, filtres, tri) sont traités dans `list-documents.use-case.ts` selon l'architecture, mais il n'existe aucun ADR documentant la stratégie FTS. C'est une décision architecturale non triviale.

**Contenu cible**

```markdown
# ADR-015: Full-Text Search Strategy

## Context

FR20 requiert une recherche par mots-clés sur le texte extrait. Cible : < 1s sur 10K documents.

## Options considérées

### Elasticsearch / OpenSearch

Ranking par pertinence sophistiqué, agrégations avancées.
Rejeté : infrastructure supplémentaire, coût, complexité opérationnelle injustifiée
pour 10K documents et 500 utilisateurs.

### Typesense / Meilisearch

Moteurs de recherche modernes, DX excellente.
Rejeté pour les mêmes raisons qu'Elasticsearch — surface cible ne le justifie pas.

### pg_trgm (trigrammes Postgres)

Similarité floue, tolérant aux fautes de frappe.
Viable mais index plus lourd, performances dégradées au-delà de 100K documents.

### tsvector / tsquery (FTS natif Postgres)

FTS intégré, index GIN léger, < 1s garanti sur 10K documents, zéro dépendance externe.

## Decision

Utiliser `tsvector` / `tsquery` avec un index GIN sur `extractedText`.
Postgres est déjà la base de données du projet — pas de service supplémentaire.
La cible de 10K documents est largement dans les capacités du FTS natif.

## Consequences

- Pas de ranking par pertinence avancé (BM25). Acceptable pour le MVP.
- Migration vers un moteur dédié possible sans changer le use-case (via ISearchProvider si nécessaire).
- Requêtes paramétrées `$queryRaw` uniquement (conformément à ADR-012).
```

---

### B6. ADR manquant : gestion globale des erreurs _(à créer : ADR-016)_

**Problème**

Aucun ADR ne documente la stratégie de gestion d'erreurs API : format de réponse, codes d'erreur standardisés, exception filter global, mapping exceptions domaine → HTTP status codes.

**Contenu cible**

```markdown
# ADR-016: API Error Handling Strategy

## Context

Les erreurs doivent être cohérentes, prévisibles et exploitables par les clients (frontend, agents MCP).

## Decision

Adopter le format RFC 7807 (Problem Details for HTTP APIs) :

{
"type": "https://errors.app/document-not-found",
"title": "Document not found",
"status": 404,
"detail": "Document abc-123 does not exist or is not accessible.",
"instance": "/documents/abc-123"
}

Un `AllExceptionsFilter` global NestJS mappe les exceptions domaine vers les status HTTP :

- `NotFoundException` (domaine) → 404
- `ForbiddenException` (domaine) → 403
- `ValidationError` (class-validator) → 422
- Erreurs non gérées → 500 + log Sentry

## Consequences

- Réponses d'erreur prévisibles pour le frontend et les agents MCP.
- Le domaine lève des exceptions métier, jamais des HttpException.
- Sentry capture les 5xx automatiquement via le filter.
```

---

### B7. ADR-EVO-001 : pipeline asynchrone ✅ _Créé — statut : Proposed_

**ADR-EVO-001 a été créé** dans `docs/adr/ADR-EVO-001-async-processing-pipeline.md` avec statut **Proposed**.

Le workflow MADR prévu :

```
ADR-EVO-001 statut: Proposed   ← maintenant (décision documentée avant implémentation)
            ↓
ADR-EVO-001 statut: Accepted   ← à l'implémentation de A1 Phase 2 (changer la ligne Status)
```

Documenter la décision _avant_ l'implémentation est une pratique de maturité — elle montre que tu as réfléchi aux trade-offs avant d'écrire du code, pas après. C'est un signal fort en entretien.

**ADR-ARCH-004** a également été mis à jour pour :

- Renommer le titre en précisant "Phase MVP (synchrone)"
- Ajouter un tableau sync vs async avec la justification du choix MVP
- Référencer ADR-EVO-001 dans une section `Planned Evolution`
- Status : `Accepted — Superseded partiellement par ADR-EVO-001`

> ADR-EVO-001 est aussi détaillé qu'ADR-OBS-002 et ADR-INFRA-003. Il compare Cloud Tasks, BullMQ et Confluent Cloud Kafka avec la décision Phase 2 (Cloud Tasks) et les triggers Phase 3 (Kafka).

---

### B8. ADR manquant : rate limiting _(à créer après A2 : ADR-018)_

**Contenu cible**

```markdown
# ADR-018: Rate Limiting Strategy

## Context

Les NFRs exigent un rate limiting configurable. Protection contre le brute force
sur l'auth et l'abus du pipeline IA (coût Gemini).

## Options considérées

### In-memory (@nestjs/throttler par défaut)

Simple, zéro dépendance. Rejeté pour scaling horizontal (état non partagé entre instances).
Acceptable pour Cloud Run si le scale-out reste limité.

### Redis store (@nestjs/throttler + Redis)

État partagé entre instances. Requiert Redis (Upstash free tier viable).
Retenu si BullMQ est déjà en place (A1), sinon overhead non justifié au MVP.

### Cloud Armor (GCP infra-level)

Rate limiting au niveau du load balancer. Pas de code applicatif.
Trop tôt pour le MVP, identifié comme évolution V2.

## Decision

`@nestjs/throttler` in-memory pour le MVP. Migration Redis store si scaling horizontal avéré.

## Limites configurées

- POST /auth/login, /auth/register : 5 req/min
- POST /documents/upload : 10 req/min
- API générale : 100 req/min
```

---

## Catégorie C — Périmètre et expérience recruteur

### C1. Définir explicitement la frontière MVP / V2

**Problème**

40 FRs sans distinction de priorité. Un recruteur qui consulte le repo ne sait pas ce qui est livré et ce qui est prévu. Cela peut donner l'impression d'un projet inachevé plutôt que d'un projet bien géré.

**Recommandation**

Ajouter dans `architecture.md` un tableau de priorisation :

| Domaine                | FRs MVP                | FRs V2            |
| ---------------------- | ---------------------- | ----------------- |
| Auth & Sessions        | FR01–FR07              | —                 |
| Gestion Documents      | FR08–FR14              | —                 |
| Pipeline IA (sync)     | FR15–FR19              | —                 |
| Pipeline IA (async)    | —                      | A1 (nouveau Epic) |
| Recherche & Découverte | FR20–FR22              | —                 |
| Administration         | —                      | FR23–FR26         |
| Intégration MCP        | FR27, FR28             | FR29, FR30        |
| RGPD                   | FR31 (droit à l'oubli) | FR32–FR34, FR40   |
| Observabilité          | FR35–FR39              | —                 |

> L'admin panel complet (FR23–FR26) et la conformité RGPD exhaustive (FR32–FR40) sont les candidats les plus naturels au report V2. Les avoir documentés dans les epics montre de la maturité de conception — les marquer V2 montre que tu sais prioriser.

---

### C2. README orienté recruteur

**Problème**

Il n'existe pas de point d'entrée pour quelqu'un qui arrive sur le repo sans contexte. Un recruteur technique passera 3 minutes sur le README avant de décider s'il creuse.

**Structure recommandée** (dans l'ordre) :

1. **Une phrase** sur ce que fait l'application
2. **Schéma d'architecture** (Mermaid ou image Excalidraw) — flux : upload → queue → worker → Gemini → storage → client
3. **Stack technique** avec liens vers les ADRs pertinents (ADR-003, ADR-004, ADR-010, ADR-013, ADR-014)
4. **Lien vers l'application déployée** (URL Firebase + Cloud Run endpoint)
5. **Lancer en local** — 5 commandes maximum, pas plus
6. **Index des ADRs** avec une ligne de description par ADR

> Le schéma d'architecture est l'élément le plus impactant. Un diagramme Mermaid dans le README est lisible directement sur GitHub sans outil externe.

---

---

## Catégorie D — Choix d'infrastructure et positionnement marché

### D1. GCP / Cloud Run est-il le bon choix pour les postes ciblés ?

**Réponse courte : GCP est acceptable. L'absence de Kafka est le vrai problème.**

**Répartition du marché cloud en entreprise française** _(sources : Synergy Research, rapports Markess/PAC sur le cloud en France)_ :

| Provider  | Part marché entreprise FR | Profil dominant                                    |
| --------- | ------------------------- | -------------------------------------------------- |
| **AWS**   | ~60–65%                   | Grands comptes, scale-ups, tout secteur            |
| **Azure** | ~25–30%                   | Entreprises sous contrat Microsoft, secteur public |
| **GCP**   | ~5–10%                    | Pure tech, data/ML, startups                       |

**Ce que ça signifie concrètement** :

- Si les postes ciblés sont en grand compte ou via ESN clients grands comptes, **AWS est le standard de facto**.
- Les concepts cloud sont cependant **transférables entre providers**. Un recruteur technique sait qu'un développeur qui maîtrise Cloud Run comprendra ECS Fargate en 2 jours. Ce n'est pas un critère éliminatoire.
- **Ce qui est éliminatoire** pour les postes event-driven : ne pas connaître Kafka. Cloud Tasks ≠ Kafka. BullMQ ≠ Kafka. La distinction est faite immédiatement en entretien.

**Pourquoi ne pas changer de cloud maintenant**

Changer de cloud en cours de projet = reconstruire tout le pipeline CI/CD, Secret Manager, GCS, Cloud Run — 2 à 3 semaines perdues sans valeur ajoutée. GCP reste cohérent. La stack existante (Cloud Run + Secret Manager + GCS + Neon.tech) est solide et défendable.

**Ce que j'aurais choisi à ta place (réponse directe)**

> Exactement ce que tu as fait — le choix async pragmatique en 2 phases est la bonne approche.
>
> - Monorepo NestJS + Vue 3 ✓
> - Cloud Run ✓ (concepts transférables vers ECS Fargate)
> - Neon.tech ✓ (plus intéressant qu'un RDS classique, montre de la veille)
> - Firebase Hosting ✓ (pragmatique pour une SPA)
> - OTel + Grafana Cloud ✓ (vendor-agnostic, signal de maturité)
> - **Cloud Tasks Phase 2** (YAGNI), **Confluent Cloud Kafka Phase 3** si justifié ← choix proportionné

**Argument de vente du choix GCP en entretien** :

> _"J'ai fait le choix de GCP pour la cohérence de l'écosystème — Cloud Run, Secret Manager, GCS sont dans le même tenant. Pour l'async, j'ai adopté une approche YAGNI en deux phases : Cloud Tasks d'abord, qui résout tous les problèmes concrets sans ajouter d'infrastructure, puis Confluent Cloud Kafka si des besoins réels apparaissent — multi-consumer, replay, volume. J'ai documenté les triggers précis dans l'ADR-EVO-001. Ce n'est pas de la procrastination, c'est une décision proportionnée au contexte actuel."_

C'est une réponse structurée qui montre que tu as pesé le choix cloud vs la valeur pédagogique.

---

## Catégorie E — Stratégie de communication technique (entretiens)

### E1. Les ADRs comme réponses préparées

Le problème de communication technique identifié (ne pas verbaliser suffisamment les choix en jargon structuré) est partiellement résolu par les ADRs eux-mêmes. **Chaque ADR est une réponse d'entretien préparée.**

ADRs à maîtriser comme réponses orales :

| ADR                                         | Question d'entretien associée                                               |
| ------------------------------------------- | --------------------------------------------------------------------------- |
| **ADR-ARCH-003** (ILlmProvider)             | _"Comment tu découples ton domaine d'un fournisseur externe ?"_             |
| **ADR-SEC-001** (AES-256-GCM)               | _"Comment tu gères les données sensibles at-rest ?"_                        |
| **ADR-ARCH-004** (state machine)            | _"Comment tu gères la robustesse d'un pipeline avec des appels externes ?"_ |
| **ADR-SEC-004** (SQL safety)                | _"Comment tu préviens les injections SQL ?"_                                |
| **ADR-OBS-002** (OTel wiring)               | _"Comment tu mets en place de l'observabilité en production ?"_             |
| **ADR-INFRA-003** (CI Trivy distroless)     | _"Comment tu intègres la sécurité dans ton pipeline CI/CD ?"_               |
| **ADR-EVO-001** (async Cloud Tasks → Kafka) | _"Comment tu passes d'un traitement synchrone à event-driven ?"_            |

### E2. Méthode de préparation orale

Pour chaque ADR ci-dessus, s'entraîner à une réponse en 3 minutes suivant ce schéma :

```
1. CONTEXTE  — "J'avais le problème suivant..."
2. OPTIONS   — "J'ai évalué X alternatives : A, B, C"
3. DÉCISION  — "J'ai retenu [X] parce que..."
4. RÉSULTAT  — "La conséquence concrète a été..."
5. LIMITE    — "Le compromis accepté était..."
```

Ce format est celui qu'utilisent les developers seniors en entretien. Il montre un raisonnement structuré en trade-offs, pas une liste de technos.

### E3. Ce que ce projet permet de dire en entretien

Après l'implémentation de A1 Phase 2 (Cloud Tasks), le projet couvre déjà :

- **Architecture distribuée** : pipeline event-driven (202 Accepted, queue-based load leveling)
- **Patterns de résilience** : idempotence, retry backoff, DLQ
- **Observabilité prod-grade** : OTel, traces distribuées, métriques de file
- **Sécurité** : AES-256-GCM, Secret Manager, distroless Docker, SQL injection prevention
- **Clean architecture** : vertical slices, ILlmProvider, domain isolation
- **CI/CD** : lint, tests, security scan (Trivy), deploy automatisé
- **Standards modernes** : MADR, RFC 7807, MCP (AI agent interoperability)
- **Compliance** : RGPD partiel, consentement versionné

C'est une couverture qui dépasse ce qu'on attend d'un profil 6 ans d'expérience — et c'est l'objectif.

---

## Notes transverses

### Ce qui est déjà fort — ne pas toucher

- **ADR-013 et ADR-014** sont au niveau de ce qu'on voit dans des équipes structurées. Utilise-les comme référence de format pour les nouveaux ADRs.
- **ADR-004** (ILlmProvider) et **ADR-005** (AES-256-GCM + Secret Manager) montrent une maturité sur la clean architecture et la sécurité. Ces deux décisions doivent être préparées comme des réponses d'entretien (voir E1).
- **ADR-012** (interdiction de `$queryRawUnsafe`) et **ADR-011** (nullable-first migrations) montrent une discipline de qualité rare à ce niveau.
- **L'intégration MCP** est différenciante — peu de projets portfolio y pensent. La positionner en avant dans le README.
- **ADR-ARCH-004 mis à jour** et **ADR-EVO-001 créé (Proposed)** documentent la trajectoire sync→async (Cloud Tasks → Kafka) avant implémentation : signal de maturité architecturale.

### Ordre d'exécution recommandé

```
✅ ADR-ARCH-004 — Mis à jour (sync intentionnel + Planned Evolution)
✅ ADR-EVO-001  — Créé (Proposed, Cloud Tasks Phase 2 → Kafka Phase 3)
✅ B1–B4        — Tous les ADRs fins enrichis avec Options considérées
✅ ADRs reorganisés par catégorie (ARCH/INFRA/SEC/DATA/OBS/EVO) + INDEX.md

1.  C1  — Frontière MVP/V2 dans architecture.md (30min)
2.  B5  — ADR-015 FTS (1h, avant d'implémenter la recherche)
3.  B6  — ADR-016 Error handling (1h, avant ou pendant Epic 2-3)
4.  A2  — Rate limiting (2–3h, pendant Epic 2)
5.  B8  — ADR-018 (30min, après A2)
6.  A1  — Pipeline async Cloud Tasks Phase 2 (2–3 jours, Epic dédié après Epic 3)
        → Passer ADR-EVO-001 de Proposed à Accepted
        → Phase 3 Kafka : déclencher uniquement si multi-consumer/replay/volume le justifient
7.  C2  — README recruteur (2–3h, quand quelque chose est déployé en prod)
```
