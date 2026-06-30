# Backend Type Placement Guideline

This guideline applies
[ADR-ARCH-002](./adr/ADR-ARCH-002-backend-vertical-slice.md). It is
intentionally small: type placement should preserve vertical-slice ownership,
reduce review noise where reuse is already proven, and avoid generic shared
contracts.

## Principles

- Keep ownership with the slice and layer that own the semantics. A documents
  application contract belongs under `documents/application`; a domain value
  object stays under the slice domain; a Prisma mapper belongs under the
  documents infrastructure adapter.
- Keep private one-off types in the implementation file when they are small,
  adapter-local, or not imported elsewhere.
- Use the slice `application/` root for application-level contracts consumed by
  multiple operations or adapters inside the slice, such as authenticated
  principals, token payloads, or auth token results.
- Move operation-specific exported contracts to an adjacent `*.types.ts` file
  when another file already consumes them, or when the implementation file has
  become difficult to review because contracts dominate the top of the file.
- Use adapter-adjacent `*.types.ts` files for exported structural adapter
  contracts that tests or nearby adapter code need to type, while keeping
  implementation-only structural types private.
- Do not move contracts to `shared/` unless production code already reuses the
  same stable rule across slices and no slice has a more natural ownership
  claim.
- Use existing port files for dependency contracts. Do not create extra
  `*.types.ts` files when an application port already owns the contract.
- Use an adjacent `*.mapper.ts` only when repository selections, persisted row
  shapes, and mapping functions obscure the repository flow.
- Deduplicate integration-test response bodies through local test support only
  when repetition exists today. Keep feature-specific test response bodies in
  the spec that owns them.

## Layer Notes

- `domain/` owns business language: entities, value objects, domain errors,
  pure domain services, and stable domain-owned types. Do not move a domain
  type to `application/` just because it is exported.
- `application/` owns use-case orchestration contracts, ports, DI tokens, and
  slice-level application contracts.
- `infrastructure/` owns adapter structural types, persistence selections, and
  mappers when they describe technical shapes.
- `presentation/` owns request and response typing plus HTTP/Nest-specific
  contracts, unless the shape is a generated DTO or a repeated test-only
  helper.

## Future Work Boundary

Planned Epics 4 through 9 can guide whether a local placement is stable enough,
but they do not justify future DTOs, future repository contracts, generic
helpers, or broad shared folders. Add those only when current production code
proves the reuse.
