# ADR-SEC-006: Document download signed URL TTL

## Status

Accepted

## Context

Raw uploaded files are stored outside the API and must not be publicly
reachable. The document detail endpoint needs to return a temporary download
link for the authenticated owner, while preserving opaque ownership semantics
and limiting the impact of a leaked URL.

The BMAD architecture records AR17/NFR09: document signed URLs must have a
maximum lifetime of 15 minutes, expressed as `ttl <= 900s`.

## Options Considered

### Longer signed URL lifetime

Rejected. Longer-lived URLs make accidental sharing, browser history exposure,
or log leakage more damaging.

### User-configurable signed URL lifetime

Rejected for the MVP. The product contract only needs one bounded document
download link, and per-request TTLs would add policy surface without a current
use case.

### Fixed 900-second signed URL lifetime

Accepted. A fixed 15-minute TTL is simple to test, satisfies AR17, and matches
the existing access-token lifetime posture.

## Decision

`GET /api/v1/documents/:id` generates `downloadUrl` through
`IFileStorage.getSignedUrl(storageKey, 900)` after the owner-scoped document
lookup succeeds.

Storage adapters must reject signed URL TTL values above 900 seconds. The HTTP
response never exposes the internal `storageKey`; it only exposes the resulting
temporary URL.

## Consequences

- Document downloads remain possible without proxying file bytes through the
  API.
- Leaked signed URLs expire quickly and cannot be extended by clients.
- Tests must cover the 900-second use-case call and the adapter upper bound.
- Future requirements for shorter-lived, one-time, or audited download links
  should revise this ADR rather than bypassing the storage port policy.
