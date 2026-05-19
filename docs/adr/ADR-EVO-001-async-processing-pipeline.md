# ADR-EVO-001: Pipeline de traitement asynchrone — Évolution progressive

## Status

**Proposed** — À implémenter après la stabilisation du MVP (pipeline synchrone documenté dans ADR-ARCH-004)

## Context

ADR-ARCH-004 a établi un pipeline synchrone comme choix délibéré pour le MVP.
Les limites connues justifient une migration vers l'asynchronisme :

- La connexion HTTP bloque pendant le traitement Gemini (jusqu'à 3s NFR).
- Aucun retry automatique si Gemini est indisponible ou timeout.
- Pas d'observabilité sur le volume de documents en attente de traitement.
- Couplage fort entre la réception de l'upload et le traitement IA.

Cette ADR documente une **évolution en deux phases** plutôt qu'un saut direct vers la
solution la plus complexe. L'objectif est de résoudre le problème avec la solution la plus
simple à chaque étape, et d'introduire la complexité uniquement quand les contraintes la
justifient réellement — conformément au principe "You Aren't Gonna Need It" (YAGNI).

La décision est documentée **avant** l'implémentation, conformément à la discipline MADR du projet.

## Options considérées

### Option A — Cloud Tasks (GCP natif) — _Phase 2 retenue_

Cloud Tasks est un service de queue HTTP managé par GCP. Le worker est un endpoint
Cloud Run standard que Cloud Tasks appelle avec retry configurable.

**Avantages :**

- Zéro infrastructure supplémentaire (pas de Redis, pas de broker à gérer)
- Intégration native Cloud Run : authentification via OIDC
- Retry + backoff + DLQ configurables nativement dans GCP
- Cohérent avec l'écosystème GCP déjà en place (Secret Manager, GCS, Cloud Run)
- Résout tous les problèmes identifiés dans le Context avec une complexité minimale
- Délai d'implémentation : ~1 jour

**Inconvénients :**

- Pas un message broker : pas de topics, pas de consumer groups, pas de replay
- Couplage HTTP entre le dispatcher et le worker (pas d'event streaming)
- Limite intrinsèque : un seul type de consumer par queue

---

### Option B — BullMQ + Redis

BullMQ est une librairie de queue Redis-backed, intégrée dans l'écosystème NestJS.

**Avantages :**

- Écosystème NestJS natif (`@nestjs/bull`, workers déclaratifs)
- Dashboard Bull Board pour visualiser les jobs, retries, DLQ
- Patterns lisibles dans le repo

**Inconvénients :**

- Dépendance Redis supplémentaire (Upstash free tier viable mais complexité ajoutée)
- Même limitation que Cloud Tasks : pas un vrai message broker
- Plus complexe que Cloud Tasks sans gain fonctionnel décisif pour ce cas d'usage

**Rejeté :** ajoute de la complexité sans valeur supplémentaire vs Cloud Tasks pour
le volume et le nombre de consumers actuels.

---

### Option C — Confluent Cloud (Kafka managé) — _Phase 3, évolution planifiée_

Confluent Cloud est le service Kafka managé de référence, disponible sur GCP.

**Avantages :**

- Kafka réel : topics, partitions, consumer groups, offsets, replay
- Multi-consumer sans refactoring (extensibilité réelle)
- Transferable vers MSK (AWS) ou Azure Event Hubs

**Inconvénients :**

- Complexité significativement plus élevée (~3–5 jours + courbe d'apprentissage)
- Surcharge injustifiée pour un seul type de consumer et un volume faible
- Introduire Kafka sans besoin de fan-out ou de replay est de l'over-engineering

---

## Decision

**Évolution en deux phases : Cloud Tasks (Phase 2) → Confluent Cloud Kafka (Phase 3)**

### Phase 2 — Cloud Tasks (prochaine étape)

Cloud Tasks résout tous les problèmes identifiés — retry, DLQ, découplage — sans
introduire de complexité architecturale non justifiée par le volume et le nombre
de consumers actuels (1 seul type de consumer, ~500 users).

Introduire Kafka directement serait de l'over-engineering : la valeur de Kafka
(fan-out multi-consumer, replay, partitionnement) n'est pas exploitée quand un seul
service consomme les messages. Commencer par Cloud Tasks montre la capacité à
choisir la solution proportionnée au problème.

### Phase 3 — Confluent Cloud Kafka (évolution future, déclencheurs identifiés)

La migration vers Kafka sera déclenchée par au moins un de ces critères :

- **Plusieurs consumers distincts** sur les mêmes événements (ex : pipeline IA + audit + analytics)
- **Besoin de replay** : rejouer des événements passés après un bug ou l'ajout d'un consumer
- **Volume** dépassant les capacités Cloud Tasks ou justifiant le partitionnement
- **Choreography complexe** entre plusieurs services indépendants

Anticiper ces besoins sans qu'ils existent serait de l'over-engineering. Les documenter
ici montre la conscience des limites de Cloud Tasks et le chemin d'évolution clair.

## Architecture Phase 2 — Cloud Tasks

```
POST /documents/upload
  → DB status: PENDING + jobId (transaction)
  → Enqueue Cloud Task → POST /internal/process-document { jobId }
  → HTTP 202 Accepted { jobId, status: "PENDING" }

Worker endpoint (Cloud Run, protégé OIDC) :
  → Vérifie jobId non déjà traité (idempotence)
  → DB status: PROCESSING
  → Upload GCS
  → Appel Gemini
  → DB status: DONE | FAILED

DLQ : Cloud Tasks → /internal/process-document-dlq après N échecs
  → DB status: FAILED + failureReason
  → Log structuré + Sentry alert

GET /documents/:id → status courant (PENDING / PROCESSING / DONE / FAILED)
```

## Architecture Phase 3 — Confluent Cloud Kafka (référence future)

```
POST /documents/upload
  → Produce → topic document.processing.requested { jobId, documentId, ... }
  → HTTP 202 Accepted

Consumer group: document-processor
  → Idempotence via jobId
  → Retry + backoff exponentiel
  → Dead letter topic: document.processing.dlq

Extensibilité sans modification du producer :
  → audit-logger consumer
  → analytics consumer
  → notification consumer
```

## Idempotence (Phase 2 et 3)

Le `jobId` est généré à l'upload et stocké en base.
Le worker vérifie si `jobId` a déjà un status ≠ PENDING avant de traiter.
Si oui : réponse 200 immédiate, pas de double traitement.

## Retry strategy — Phase 2 (Cloud Tasks)

- Cloud Tasks : max 3 tentatives, backoff exponentiel configurable dans la console GCP
- Après 3 échecs : route DLQ + DB status FAILED avec `failureReason`

## Consequences

**Phase 2 (Cloud Tasks) :**

- Pipeline découplé sans nouvelle dépendance d'infrastructure.
- Retry et DLQ gérés nativement par GCP, zéro code de gestion de queue.
- Observabilité via Cloud Tasks dashboard + logs structurés existants.
- Limitation connue et acceptée : pas de replay, pas de multi-consumer.
- Vocabulaire entretien débloqué : 202 Accepted, idempotence, retry backoff, DLQ,
  queue-based load leveling, découplage producteur/consommateur.

**Phase 3 (Kafka — future) :**

- Débloque : fan-out multi-consumer, replay, partitionnement.
- Vocabulaire entretien supplémentaire : topics, partitions, consumer groups,
  offsets, at-least-once delivery, dead letter topic.
- La machine d'états (PENDING / PROCESSING / DONE / FAILED) est compatible
  avec les deux phases sans modification du schéma Prisma.

## See Also

- [ADR-006](./ADR-ARCH-004-upload-processing-state-machine.md) — Pipeline synchrone MVP (Superseded partiellement)
- [ADR-010](./ADR-OBS-001-observability-stack.md) — Observabilité (métriques Cloud Tasks à intégrer)
