# ADR-ARCH-005: Gemini Flash Model Selection

## Status
Accepted

## Date
2026-06-19

## Context
Story #19 originally referenced Gemini 2.0 Flash Vision for the infrastructure
LLM provider. Google AI documentation now marks `gemini-2.0-flash` as shut down
on 2026-06-01, so using it as the runtime default would make the adapter fail
in staging and production.

The provider still needs a low-latency, multimodal Flash model that can process
PDF/image inputs and remain usable in the Gemini API free tier for MVP volumes.

## Options Considered

### Keep `gemini-2.0-flash`
Rejected because the model endpoint is shut down.

### Use `gemini-3-flash-preview`
Rejected as the default because preview models can carry more restrictive rate
limits and shorter deprecation windows.

### Use `gemini-3.1-flash-lite`
Viable for very high-volume lightweight extraction, but it trades quality for
cost efficiency. Document extraction, classification, summary, and confidence
scoring need better accuracy than the cheapest option by default.

### Use `gemini-3.5-flash`
Accepted because it is listed as stable, is a Flash model, supports the free
tier, and fits the project goal of a single fast multimodal analysis call.

## Decision
Default the backend Gemini provider to `gemini-3.5-flash`.

Make the model configurable through `GEMINI_MODEL` and the timeout configurable
through `GEMINI_TIMEOUT_MS` with an 8000ms default. Keep `@google/generative-ai`
SDK imports confined to `ai/infrastructure/`, as required by the story contract
and ADR-ARCH-003.

## Consequences
- Staging and production avoid the dead Gemini 2.0 Flash endpoint.
- Future Google model changes require an environment update, not a code change.
- Free-tier usage remains possible, but active quotas must be checked in Google
  AI Studio for the project.
- Free-tier Gemini API traffic may be used by Google to improve products, so
  production documents should move to a paid tier if this conflicts with data
  handling requirements.

## References
- https://ai.google.dev/gemini-api/docs/models
- https://ai.google.dev/gemini-api/docs/pricing
