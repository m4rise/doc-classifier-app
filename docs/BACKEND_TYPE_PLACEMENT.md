# Backend Type Placement Guideline

This guideline applies ADR-ARCH-002. It is intentionally small: type placement
should preserve vertical-slice ownership, reduce review noise where reuse is
already proven, and avoid generic shared contracts.

## Principles

- Keep ownership with the slice and layer that own the semantics. A documents
  application contract belongs under `documents/application`; a Prisma mapper
  belongs under the documents infrastructure adapter.
- Keep private one-off types in the implementation file when they are small,
  adapter-local, or not imported elsewhere.
- Move exported contracts to an adjacent `*.types.ts` file when another file
  already consumes them, or when the implementation file has become difficult
  to review because contracts dominate the top of the file.
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

## Future Work Boundary

Planned Epics 4 through 9 can guide whether a local placement is stable enough,
but they do not justify future DTOs, future repository contracts, generic
helpers, or broad shared folders. Add those only when current production code
proves the reuse.
