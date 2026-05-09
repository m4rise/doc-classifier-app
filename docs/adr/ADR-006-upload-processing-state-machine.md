# ADR-006: Upload Processing State Machine

## Status
Accepted

## Context
Le pipeline IA doit être robuste aux échecs externes.

## Decision
Ordonner le flux: DB `PENDING` -> upload GCS -> appel Gemini -> DB `DONE`/`FAILED`.

## Consequences
- Pas de corruption DB sur panne LLM.
- Traçabilité claire de l'état métier.
