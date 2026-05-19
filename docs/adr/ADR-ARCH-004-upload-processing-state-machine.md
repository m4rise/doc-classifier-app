# ADR-ARCH-004: Upload Processing State Machine — Phase MVP (synchrone)

## Status

Accepted — **Superseded partiellement par [ADR-EVO-001](./ADR-EVO-001-async-processing-pipeline.md) (Proposed) pour la phase post-MVP**

## Context

Le pipeline IA doit être robuste aux échecs externes.
En phase MVP, la priorité est la livraison rapide d'une chaîne fonctionnelle end-to-end.
Le traitement asynchrone est identifié comme une évolution planifiée (voir ADR-EVO-001).

## Decision

Ordonner le flux de façon **synchrone dans le cycle de vie de la requête HTTP** :

```
POST /documents/upload
  → DB status: PENDING
  → Upload fichier vers GCS
  → Appel Gemini (OCR + classification + résumé)
  → DB status: DONE | FAILED
  → HTTP 201 avec le document complet
```

### Pourquoi synchrone en MVP

| Critère                          | Choix sync               | Choix async                         |
| -------------------------------- | ------------------------ | ----------------------------------- |
| Complexité d'implémentation      | Faible                   | Élevée (queue, worker, polling/SSE) |
| Délai de livraison MVP           | Rapide                   | +3–5 jours                          |
| Expérience utilisateur           | Attente bloquante (< 3s) | Non-bloquant, polling nécessaire    |
| Résilience aux pannes LLM        | Retry manuel             | Retry automatique configurable      |
| Observable en profondeur de file | Non                      | Oui                                 |

La cible NFR (Gemini Flash < 3s) rend l'attente synchrone acceptable pour le volume MVP
(500 users, charge faible). Ce choix est intentionnel et borné dans le temps.

## Consequences

- Pas de corruption DB sur panne LLM (état machine PENDING → DONE/FAILED).
- Traçabilité claire de l'état métier.
- La connexion HTTP reste ouverte pendant le traitement Gemini.
- Aucun mécanisme de retry automatique natif si Gemini est indisponible.
- **Limitation connue et acceptée** : non adapté à une montée en charge ou à des documents longs.

## Planned Evolution

ADR-EVO-001 documente une évolution **en deux phases** :

- **Phase 2 — Cloud Tasks** : découplage HTTP via queue GCP native, retry/DLQ sans nouvelle infrastructure.
  Résout tous les problèmes identifiés (connexion bloquante, retry, observabilité) avec la solution la plus simple.
- **Phase 3 — Confluent Cloud Kafka** : déclenchée uniquement si fan-out multi-consumer,
  replay ou volume le justifient. Documenté à titre de roadmap, pas d'over-engineering anticipé.

La machine d'états (PENDING / PROCESSING / DONE / FAILED) est conçue pour être
compatible avec les deux phases sans modification du schéma Prisma.
