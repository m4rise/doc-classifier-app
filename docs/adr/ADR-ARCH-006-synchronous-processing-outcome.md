# ADR-ARCH-006: Synchronous Processing Outcome Persistence

## Status

Accepted

## Date

2026-06-22

## Context

Story #20 completes the synchronous MVP pipeline introduced by
ADR-ARCH-004. Two earlier contracts leave important implementation details
open:

- Story #17 returns HTTP 202 with a `PENDING` document before AI processing is
  available.
- The `processing_results` schema includes a nullable `errorMessage`, but all
  success analysis fields are required, so a failure cannot be represented
  without fake analysis values.

Running work in the background after returning HTTP 202 is unsafe in the MVP
Cloud Run request lifecycle because there is no durable queue or worker yet.
Returning HTTP 202 after awaiting the complete pipeline is also misleading:
the request is no longer merely accepted for later processing.

The documents application slice must consume `ILlmProvider`, but the project
forbids direct application-layer imports across feature slices. The provider
contract therefore needs a shared canonical location while preserving the
Story #18 compatibility import from `ai/domain`.

## Decision

### Request lifecycle

`POST /api/v1/documents/upload` awaits the complete processing pipeline:

1. validate and store the upload using the Story #17 flow;
2. create the `PENDING` document;
3. atomically claim it as `PROCESSING`;
4. download the stored object through `IFileStorage`;
5. analyze it through `ILlmProvider`;
6. atomically persist the processing outcome and the `DONE` or `FAILED`
   document status;
7. return HTTP 201 with the terminal document representation.

This intentionally supersedes the HTTP 202/PENDING response semantics of
Story #17 once Story #20 is deployed. A failed AI analysis still returns the
created document with `status: "FAILED"` and a sanitized `errorMessage`; the
resource creation itself succeeded and the document remains retrievable.

`GET /api/v1/documents/:id` returns the same terminal representation only to
the owning authenticated user. Missing and non-owned identifiers both return
HTTP 404 to avoid resource-existence disclosure.

### Processing outcome model

`ProcessingResult` represents exactly one terminal processing outcome:

- `DONE`: all analysis fields are non-null and `errorMessage` is null;
- `FAILED`: all analysis fields are null and `errorMessage` contains a
  sanitized, operationally useful message.

The analysis columns are therefore nullable in the database. Application
logic enforces the two valid shapes. Empty strings, zero-score sentinels, and
raw provider errors are forbidden.

The terminal document transition and `ProcessingResult` insertion occur in a
single Prisma transaction for both success and failure. The initial
`PENDING → PROCESSING` claim is conditional and atomic so concurrent callers
cannot process the same document twice.

### Cross-slice provider contract

The canonical `ILlmProvider`, `LlmDocumentInput`, and `LlmAnalysisResult`
contracts live under `shared/interfaces`. `ai/domain/ILlmProvider.ts` remains a
type-only compatibility export for existing Story #18 consumers. Provider SDK
imports remain confined to `ai/infrastructure`.

## Alternatives Considered

### Return HTTP 202 and process in the background

Rejected for the synchronous MVP. Without Cloud Tasks or another durable
worker, request-local background work can be terminated and cannot provide
reliable retries.

### Await processing but keep HTTP 202/PENDING

Rejected because the response would describe work as pending after it has
already reached a terminal state.

### Store failures with empty analysis values

Rejected because empty strings and a zero confidence score look like genuine
analysis data and would contaminate downstream behavior.

### Add another error field to `Document`

Rejected because `processing_results.errorMessage` already establishes the
processing outcome as the error owner. Duplicating the field would create two
sources of truth.

## Consequences

- Upload latency includes storage download and the Gemini timeout window.
- The API response changes from HTTP 202/PENDING to HTTP 201 with a terminal
  `DONE` or `FAILED` document.
- Failure rows can be represented honestly without fake values.
- Completed outcomes and status transitions are atomic.
- The synchronous flow remains intentionally temporary; ADR-EVO-001 defines
  the durable asynchronous evolution.
- A later retry feature must define whether the one-to-one processing outcome
  is replaced or versioned before retries are introduced.

### Accepted MVP recovery limitations

The `PENDING → PROCESSING` claim commits before storage and Gemini calls so
concurrent requests cannot process the same document. This also means that a
process termination after the claim, or a database outage while persisting the
terminal outcome, can leave a document in `PROCESSING`. The synchronous MVP has
no lease, automatic retry, or stale-claim recovery mechanism. Durable recovery
belongs to the queued evolution in ADR-EVO-001; operators must reconcile stale
rows manually until that evolution is implemented.

`IFileStorage.download()` does not add a separate application-level timeout in
this story. Storage SDK and platform timeouts remain the outer bound, while the
Gemini call retains its explicit `GEMINI_TIMEOUT_MS` guard. Adding an abortable
storage timeout requires a provider-neutral cancellation contract and is left
to the same resilience evolution rather than simulated with a non-cancelling
`Promise.race()`.

Documents already in `PENDING` or `PROCESSING` before Story #20 is deployed are
not replayed automatically. They require an operational reconciliation or a
future retry endpoint; silently claiming historical rows during application
startup would introduce unbounded external work and unsafe multi-instance
coordination.

## References

- GitHub Story #20
- GitHub Epic #84
- ADR-ARCH-002 — Backend Vertical Slice + Clean Light
- ADR-ARCH-003 — LLM provider abstraction
- ADR-ARCH-004 — synchronous MVP processing state machine
- ADR-EVO-001 — planned asynchronous pipeline
