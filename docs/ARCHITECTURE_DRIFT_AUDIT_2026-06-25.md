# Architecture Drift Audit - 2026-06-25

This audit captures architectural drift observed after Epic 3 and the first
Epic 4 stories. It is not an ADR and does not approve the current state. Its
purpose is to turn repeated PR risk notes, local code patterns, and story/code
mismatches into an explicit remediation backlog before the patterns spread.

## Scope And Sources

- Backend code on `main` as of 2026-06-25.
- GitHub Epics #84 and #85.
- Story issues #16 to #23.
- Merged PRs #102, #103, #104, #109, #110, #111, #112, and #113.
- Existing ADRs, especially ADR-ARCH-002, ADR-DATA-003, ADR-SEC-006, and
  ADR-EVO-001.

No inline human review threads exist on PRs #102, #103, #104, #109, #110,
#111, #112, or #113. The useful review inputs are therefore the PR
`Risks / Points to watch` sections, one substantive PR #109 comment, and the
repeated Codecov comments.

## Executive Summary

The highest-risk drift is configuration. The backend has a documented
environment inventory in `backend/.env.example`, but runtime code still reads
`process.env` directly or through many custom `resolve*` functions. Story #21
already expected `ConfigService`, while PR #111 explicitly kept the current
custom style. This should be corrected before more tunables are added.

The second drift family is local validation and type-narrowing logic. UUID,
email, Prisma error, token error, cursor, and positive-integer parsing patterns
are being implemented close to each feature. Some are fine as local prototypes,
but several have now become cross-slice or cross-story contracts.

The third drift family is policy value sprawl. Values such as JWT TTLs,
document signed URL TTLs, throttle windows, upload limits, confidence threshold,
Prisma pool limits, and Gemini timeouts are split across constants, tests,
module providers, docs, workflows, and env examples. Constants are acceptable
for pure implementation details, but runtime policy should be owned by typed
configuration with documented defaults and bounds.

## Drift Cases

### DRIFT-001 - Runtime Configuration Is Not Centralized

Severity: High

Examples:

- `backend/src/documents/infrastructure/config/file-storage.config.ts`
- `backend/src/documents/infrastructure/config/file-size-limit.ts`
- `backend/src/documents/infrastructure/config/confidence-threshold.config.ts`
- `backend/src/llm/infrastructure/gemini/config/gemini.config.ts`
- `backend/src/shared/infrastructure/rate-limiting/throttle.config.ts`
- Direct `process.env` reads in `app.module.ts`, `main.ts`, `instrument.ts`,
  `prisma.service.ts`, `auth.module.ts`, `local-file-storage.ts`, and JWT
  secret resolvers.

Why it matters:

- Required secrets and invalid config are validated inconsistently.
- Some invalid values silently fall back to defaults, while others throw.
- Tests patch `process.env` directly in many places.
- Story #21 asked for `ConfigService`, but the implementation preserved custom
  resolvers.

Target state:

- Add `@nestjs/config`.
- Register a global config module with a single validation schema. The project
  already uses `zod`, so a Zod-backed validation path is a reasonable default
  unless there is a Nest-specific reason to use Joi.
- Expose typed config namespaces, for example `auth`, `documents.storage`,
  `documents.downloads`, `llm.gemini`, `rateLimit`, `database`, and
  `observability`.
- Fail fast for required production secrets and invalid bounded values.
- Keep `.env.example`, deployment workflows, and docs generated or manually
  checked against the same env key list.

Suggested first issue:

Adopt `@nestjs/config` with typed validation and migrate existing custom
resolvers behind a single `AppConfig` contract.

### DRIFT-002 - Runtime Policy Values Are Spread Across Code And Docs

Severity: High

Examples:

- Document signed URL TTL appears as `DOCUMENT_DOWNLOAD_URL_TTL_SECONDS = 900`
  in `get-document.use-case.ts`, `MAX_SIGNED_URL_TTL_SECONDS = 900` in
  `gcs-file-storage.ts`, tests expecting `900`, and ADR-SEC-006.
- Auth token TTL appears as `expiresIn: '15m'`, provider value `900`,
  constructor defaults `900`, `expiresIn: '7d'`, and `7 * 24 * 60 * 60`.
- Rate-limit defaults are embedded in `throttle.config.ts` and mirrored in
  `.env.example`, docs, and deployment workflows.
- Prisma pool settings are hardcoded in `prisma.service.ts`.
- Gemini defaults and timeout bounds are custom constants in
  `gemini.config.ts`.

Why it matters:

- A policy change requires touching unrelated files.
- Tests verify duplicated values rather than a single source of truth.
- PR #113 enforced the 900-second signed URL value per story/ADR, but this is
  exactly the kind of runtime policy the project should be able to tune through
  validated config.

Target state:

- Move runtime policy values to typed config with defaults and explicit maximums.
- Keep hard security caps in code when needed, but make the effective default
  configurable within the cap.
- Revise ADR-SEC-006 if the intended decision changes from fixed 900 seconds
  to configurable signed URL TTL with a maximum of 900 seconds.
- Use one duration representation at module boundaries, preferably seconds in
  config and explicit conversion helpers for libraries that expect strings or
  milliseconds.

Suggested first issue:

Extract auth TTL, document signed URL TTL, upload size, confidence threshold,
throttle defaults, Gemini timeout/model, Prisma pool, and observability runtime
values into typed config.

### DRIFT-003 - Validation And Type Guards Are Repeated Locally

Severity: Medium-High

Examples:

- UUID regex appears in `list-documents.use-case.ts`,
  `document-storage-key.ts`, and document integration tests.
- Email normalization and regex validation are duplicated between
  `auth/domain/value-objects/email.vo.ts` and
  `users/domain/value-objects/profile-email.vo.ts`.
- `readPositiveIntegerEnv` is implemented independently in multiple config
  files.
- Prisma unique constraint detection is duplicated in auth and users
  repositories.
- JWT expiration detection exists in both `jwt-auth.guard.ts` and
  `refresh-token.guard.ts`, with different shapes.

Why it matters:

- Small changes to validation rules will diverge across slices.
- Boolean helpers lose narrowing information unless they return predicates.
- Error handling becomes string/name based instead of typed at the boundary.

Target state:

- Add small shared primitives only after a rule is genuinely cross-slice:
  `shared/domain/value-objects/email.vo.ts`, `shared/domain/ids/uuid.ts`, or
  `shared/infrastructure/prisma/prisma-errors.ts`.
- Replace ad hoc env parsing with the central config schema from DRIFT-001.
- Make guards return predicates when they inspect unknown input, for example
  `value is SerializedDocumentCursor` or `info is PassportJwtErrorInfo`.
- Keep feature-specific validation close to the feature until it is reused.

Suggested first issue:

Centralize UUID, email, Prisma unique-constraint, and Passport JWT error
helpers while preserving slice boundaries from ADR-ARCH-002.

### DRIFT-004 - Cursor Encoding Is Embedded In The Use Case

Severity: Medium

Examples:

- `ListDocumentsUseCase` owns Base64 decoding, JSON parsing, exact key checks,
  UUID validation, date validation, and pagination orchestration.
- ADR-DATA-003 states future sorting/filtering in Story #27 will need explicit
  cursor contracts.
- PR #112 already notes that future sorting/filtering must not reuse the
  current cursor blindly.

Why it matters:

- Story #27 will likely add filter/sort cursor variants.
- The use case currently mixes application orchestration and wire-format
  validation.
- Cursor validation is hard to reuse or test independently outside the use case.

Target state:

- Extract a `DocumentListCursorCodec` or local pagination codec under
  `documents/application/pagination/`.
- Validate the serialized cursor with a schema rather than manual key checks.
- Keep ownership enforcement in the repository/use case, not in the serialized
  cursor.
- Make future cursor versions explicit instead of overloading the current
  `{ id, createdAt }` shape.

Suggested first issue:

Extract document cursor encode/decode and validation before implementing Story
#27 search/filter/sort.

### DRIFT-005 - Exported Contracts Are Often Co-Located With Implementations

Severity: Medium

Examples:

- Use-case input/output interfaces are exported from use-case files.
- `PrismaDocumentRepository` contains persisted interfaces, selection maps, and
  mapping functions in one 350+ line file.
- `GcsFileStorage` declares local structural client interfaces in the adapter.
- Integration specs define repeated response-body interfaces locally.

Why it matters:

- Co-location is fine while a type is private and small.
- It becomes noisy when exported contracts are reused by controllers, tests,
  modules, or future features.
- Large repository and integration-spec files make architectural review harder.

Target state:

- Keep private one-off helper types local when they are truly adapter-local.
- Move exported use-case input/output contracts into adjacent `*.types.ts` files
  or existing port files when they are consumed outside the implementation.
- Split large integration specs with helper builders/fixtures once they exceed
  one feature workflow.
- Consider repository mapper files when selections and mapping logic grow.

Suggested first issue:

Create a backend type-placement guideline and apply it first to document use
cases, repository mappers, and repeated integration test response bodies.

### DRIFT-006 - PR Risk Notes Are Not Converted Into Follow-Up Work

Severity: Medium-High

Examples from Epic 3 and Epic 4 PRs:

- PR #103: production GCS permissions and `signBlob` role must be confirmed.
- PR #104: story scope mismatch around classify-document was intentionally
  limited.
- PR #109: Gemini quota/billing, free-tier data-use terms, DOCX coverage, and
  MIME support require follow-up decisions.
- PR #110: synchronous processing is temporary; process termination can leave
  non-terminal rows; existing pending rows are not replayed.
- PR #111: issue text asked for `ConfigService`, implementation kept current
  custom config style.
- PR #112: `total` count cost and future cursor contracts need monitoring.
- PR #113: signed URL TTL policy is fixed in code and adapter.

Why it matters:

- The risks are real, but they are buried in merged PR bodies.
- There are no inline review threads on the audited PRs.
- Future agents will not naturally find these notes before adding more code.

Target state:

- Treat non-trivial `Risks / Points to watch` entries as backlog candidates.
- A PR can still merge with a risk, but the PR body should link the follow-up
  issue or explain why no follow-up is needed.
- Skills should explicitly scan recent PR risks before continuing an epic.

Suggested first issue:

Create GitHub-only technical debt issues for config centralization, cursor
codec extraction, Gemini/DOCX provider capability, sync-processing recovery,
and production GCS permissions.

### DRIFT-007 - Repeated Low Patch Coverage Is Being Accepted As Noise

Severity: Medium

Examples:

- PR #103 patch coverage: 52.40175%.
- PR #109 patch coverage: 70.88608%.
- PR #110 patch coverage: 52.13675%.
- PR #112 patch coverage: 48.68421%.
- PR #113 patch coverage: 56.25000%.

PR #102 had all modified coverable lines covered. PR #104 and #111 were higher
but still reported missing lines.

Why it matters:

- Current local tests can pass while patch coverage repeatedly flags untested
  new paths.
- The Codecov app warning also suggests coverage reporting is not fully wired.
- Low coverage is not automatically architectural debt, but repeated low
  coverage on integration-heavy changes hides edge-case drift.

Target state:

- Decide whether Codecov is an advisory comment or a required quality gate.
- If advisory, add a PR rule that low patch coverage must be acknowledged in
  `Risks / Points to watch`.
- If required, configure thresholds and install/fix the Codecov app.

Suggested first issue:

Clarify Codecov policy and wire patch coverage expectations into PR review.

### DRIFT-008 - ADRs Are Sometimes Used To Justify Temporary Choices Without A

Follow-Up Trigger

Severity: Medium

Examples:

- ADR-SEC-006 accepts a fixed 900-second signed URL TTL, but runtime
  configurability is now desired.
- ADR-EVO-001 documents the future async pipeline, while PR #110 states the
  synchronous workflow can leave non-terminal rows.
- ADR-DATA-003 warns future sorts need compatible cursors, but Story #27 is
  still open.

Why it matters:

- ADRs are useful only if they also create clear revision points.
- Temporary choices can become permanent through inertia.

Target state:

- Add explicit "revisit triggers" to ADRs when a decision is temporary or
  expected to evolve.
- Link follow-up issues from ADR consequences when the risk is known today.
- Prefer one new ADR or ADR amendment over scattering policy changes in PR
  descriptions.

Suggested first issue:

Amend ADR-SEC-006 and ADR-EVO-001 with concrete revisit triggers and linked
technical debt issues.

## Recommended Remediation Order

1. Configuration foundation: add `@nestjs/config`, schema validation, typed
   config namespaces, and a migration plan for custom resolvers.
2. Policy value cleanup: move auth TTLs, document download TTL, upload limits,
   confidence threshold, throttling, Prisma pool, Gemini, and observability
   settings behind typed config.
3. Cursor codec extraction: refactor the Story #4.1 cursor before Story #4.6
   adds search/filter/sort variants.
4. Shared validation helpers: centralize UUID, email, Prisma unique constraint,
   and Passport JWT error helpers where reuse is already proven.
5. Type placement guideline: split exported contracts and large mapper/test
   helper types where they are now shared or noisy.
6. PR process guardrails: require non-trivial risk notes to link follow-up
   issues or explain why no follow-up is needed.
7. Coverage policy: decide whether Codecov is informational or gating.

## Suggested Backlog Split

- `chore(config): adopt NestJS ConfigModule and validated app config`
- `refactor(config): migrate auth, documents, LLM, database, and rate-limit
policy values to typed config`
- `refactor(documents): extract document cursor codec before search/filter/sort`
- `refactor(shared): centralize UUID, email, Prisma, and JWT error helpers`
- `docs(architecture): add type-placement and validation guidelines`
- `chore(ci): clarify Codecov patch coverage policy`
- `docs(adr): amend signed URL TTL and async-processing revisit triggers`
- `chore(github): require PR risk notes to link follow-up issues`

## Follow-Up PR Grouping

Use this grouping when opening future remediation issues or PRs from this
audit. Keep the first config PR scoped to the foundation; do not fold the
runtime policy migration into it unless the GitHub issue explicitly expands the
contract.

| Group | Scope                                                                                                                                   | Drift Coverage                                                   |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| A     | Config foundation: add `@nestjs/config`, Zod validation, typed config namespaces, and bootstrap consumption for app-level config.       | DRIFT-001 plus the foundation portion of DRIFT-002 and DRIFT-003 |
| B     | Runtime policy migration: move TTLs, thresholds, limits, Prisma pool, throttling, Gemini, and observability values behind typed config. | DRIFT-002 plus remaining env parsing from DRIFT-003              |
| C     | Document cursor codec extraction before Story 4.6 search/filter/sort work.                                                              | DRIFT-004                                                        |
| D     | Shared UUID, email, Prisma unique-constraint, and Passport JWT error helpers.                                                           | DRIFT-003                                                        |
| E     | ADR amendments for signed URL TTL policy, async-processing revisit triggers, and linked follow-up issues.                               | DRIFT-008                                                        |
| F     | Codecov policy clarification: decide advisory vs gating behavior and PR expectations.                                                   | DRIFT-007                                                        |

PR #117 started as Group A and was explicitly expanded during review to cover a
targeted Group B subset: auth TTL/hash policy, document download/list/upload
policy, Gemini provider options, and Prisma pool settings. Remaining Group B
items after that PR are static throttle decorator policy and pre-Nest
observability bootstrap reads.

Follow-up issue #118 is the dedicated GitHub-only track for those remaining
Group B items. Its implementation removes the local throttle env parser and
routes static decorator policy through the typed rate-limit config initialized
at bootstrap; it also routes pre-Nest observability bootstrap reads through the
central config parser. No additional Group B item is intentionally deferred.
`instrument.ts` remains outside Nest `ConfigService` by design because it must
run before Nest modules are loaded.

Follow-up issue #120 is the dedicated GitHub-only track for Group C. Its
implementation extracts the document list cursor Base64/JSON codec and strict
payload validation into `documents/application/pagination/` without changing
the `{ id, createdAt }` contract. No Group C item is intentionally deferred.
Ownership derivation, stale/non-owned cursor rejection, and Prisma cursor
construction remain in the use case/repository by design and are not codec
responsibilities.

Follow-up issue #122 is the dedicated GitHub-only track for Group D. Its
implementation extracts the proven cross-slice email syntax rule into
`shared/domain` and Prisma `P2002` detection into `shared/infrastructure`. It
keeps auth/users value objects, domain errors, and repository error translation
local to their owning slices. Passport JWT expiration inspection is extracted
only within auth because access and refresh guards intentionally retain distinct
control flow and HTTP messages. The repeated production UUID syntax rule is
owned locally by documents and reused by the cursor codec and storage-key
validation; test regexes remain independent assertions. Focused unit tests lock
the extracted primitives and intentional guard branches, while the existing
PostgreSQL-backed integration suites remain the evidence for repository error
translation and observable HTTP/JWT behavior. No mock repository tests are
added merely to replace an unavailable integration environment. No Group D item
extraction is deferred. The intentionally preserved breadth of the email regex
and all-`P2002` repository mapping are product-contract questions outside this
refactor, not incomplete helper extraction. No future Epic 4-9 behavior is
implemented by this remediation.

Follow-up issue #124 is the dedicated GitHub-only track for DRIFT-005. Its
implementation adds [Backend Type Placement Guideline](./BACKEND_TYPE_PLACEMENT.md),
moves currently reused use-case contracts to owner-aligned type files, extracts
the documents Prisma mapper/selections from the repository, keeps exported
structural adapter contracts adjacent to their adapter, and deduplicates only
the integration-test response-body helpers that are repeated today. One-off
use-case inputs/results stay local and private, GCS structural client types stay
inside the adapter because they are an implementation-only seam, and
feature-specific integration response bodies stay in their owning specs. No
generic `shared` type folder is introduced, and no future Epic 4-9 contracts are
implemented by this remediation.

`DRIFT-006` remains a valid follow-up track, but it should not be bundled into
DRIFT-005 or the config foundation work unless a new issue explicitly asks for
that broader scope.

## Notes For Future Agents

- Do not add new `resolve*` env helpers unless they are part of the centralized
  config migration.
- Do not introduce runtime policy constants in use cases or adapters when an
  env/config value is more appropriate.
- Do not duplicate regexes or unknown-input guards when the rule is already used
  across slices or stories.
- When a PR accepts a temporary compromise, create or link the follow-up issue
  in the PR risk section.
