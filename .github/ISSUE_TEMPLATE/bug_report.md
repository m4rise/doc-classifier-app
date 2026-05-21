---
name: Bug report
description: Report a reproducible bug or regression
labels: [bug]
assignees: []
---

### Summary
A clear and concise description of the bug.

### Affected Area
- **Domain / Slice:** <!-- auth | documents | ai | users | admin | search | rgpd | mcp | shared | frontend -->
- **Environment:** <!-- dev (local docker-compose) | staging | prod -->
- **Layer:** <!-- API (NestJS) | Vue 3 frontend | Prisma / DB | GCS | Gemini pipeline | CI/CD -->

### Steps to Reproduce
1.
2.
3.

### Expected Behavior
What should happen.

### Actual Behavior
What actually happens. Include:
- HTTP status code and response body (if API)
- Document status (`PENDING` / `PROCESSING` / `DONE` / `FAILED`) if pipeline related

### Logs
```
# Paste relevant log lines here.
# Include X-Request-ID if available — it correlates backend traces end-to-end.
```

### Environment Details
- App version / commit SHA:
- Browser (if frontend):
- Node version (`node --version`):

### Severity
- [ ] Blocking — feature completely unusable or data corruption risk
- [ ] Degraded — partial failure, workaround exists
- [ ] Cosmetic — visual / UX issue only

### Security / RGPD Impact
- [ ] This bug may expose PII or encrypted data
- [ ] This bug may affect RGPD deletion atomicity
- [ ] No security / RGPD impact
