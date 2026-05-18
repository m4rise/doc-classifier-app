---
name: Feature request
description: Suggest a new feature or improvement
labels: [enhancement]
assignees: []
---

### Problem Statement
What problem does this feature solve? Reference an existing FR/NFR if applicable (e.g. `FR08`, `NFR05`), or describe a new need.

### Proposed Solution
Describe what you want. Be specific: endpoints, UI flows, data model changes.

### Affected Domain / Slice
- [ ] `auth` — JWT, refresh tokens, roles
- [ ] `documents` — upload, pipeline, list/search/delete
- [ ] `ai` — Gemini provider, `ILlmProvider`, prompts
- [ ] `users` — profile, RGPD export/deletion
- [ ] `admin` — user management, audit logs
- [ ] `analytics` — global stats, metrics
- [ ] `mcp` — MCP server tools, `.mcp.json`
- [ ] `shared` — cross-cutting (encryption, file storage, rate limiting)
- [ ] `frontend` — Vue 3, Pinia, Axios, router

### Architecture Considerations
- Does this require a new ADR? <!-- Yes / No / Maybe -->
- Does this change the Prisma schema? <!-- Yes (new migration) / No -->
- Does this introduce a new env variable? <!-- Yes (add to .env.example) / No -->
- Does this touch security or RGPD compliance? <!-- Yes (explain below) / No -->
- Does this affect the Gemini pipeline or `ILlmProvider`? <!-- Yes / No -->

### Alternatives Considered
Describe alternatives and why the proposed solution is preferred.

### Additional Context
<!-- Screenshots, API sketches, sequence diagrams, relevant ADRs -->
