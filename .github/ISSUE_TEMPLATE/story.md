---
name: Story
about: Implementable unit of work aligned with a project epic
labels: [story]
assignees: []
---

## User Story
As a **[actor: developer | user | admin | ai-agent]**,
I want **[goal]**,
So that **[benefit]**.

> **Epic:** <!-- Epic N — Name -->
> **FRs covered:** <!-- FR01, FR02, ... -->
> **ARs covered:** <!-- AR10, AR11, ... -->

## Definition of Ready (DoR)
- [ ] Previous story completed (if sequential)
- [ ] Dependencies resolved and accessible
- [ ] ADR written if this story introduces a new architectural decision
- [ ] Acceptance criteria agreed and unambiguous

## Acceptance Criteria

**Given** [precondition]
**When** [action]
**Then** [expected outcome]

---

**Given** [precondition]
**When** [action]
**Then** [expected outcome]

## Definition of Done (DoD)
- [ ] Code follows vertical slice + Clean Architecture conventions (`domain/` never imports NestJS/Prisma)
- [ ] Unit tests cover all domain business paths
- [ ] Integration test added if DB / GCS / Gemini involved
- [ ] ESLint + Prettier pass (`npm run lint` green)
- [ ] `npm run build` succeeds with zero TypeScript errors
- [ ] ADR written / updated if an architectural decision was made
- [ ] `.env.example` updated if a new environment variable is introduced
- [ ] PR title follows Conventional Commits: `feat(scope): ...` with valid scope
- [ ] CI green on PR before merge

## Implementation Tasks
- [ ] 
- [ ] 

## Security / RGPD Checklist
- [ ] No PII in logs — only `traceId` / UUIDs logged
- [ ] Ownership verified in use case before any resource access
- [ ] All DTOs validated with `class-validator` — no raw request data passed to use cases
- [ ] `$queryRawUnsafe` not used — only `prisma.$queryRaw` template literals
- [ ] New env vars follow naming convention in `.env.example`
