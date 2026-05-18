# ADR-014 — CI Pipeline Strategy

**Status:** Accepted  
**Date:** 2026-05-18

## Context

Story 1.5 introduced a GitHub Actions CI pipeline to gate merges on quality checks. Several decisions had to be made about when to run CI, how to avoid duplicate runs, and how to harden the Docker image scanned by Trivy.

## Decisions

### 1. Trigger strategy: `pull_request` + `push: branches: [main]`

**Decision:** Run CI on two events only:
- `pull_request` targeting `main` → gates all merges
- `push` to `main` → validates the final squash commit post-merge

**Rejected:** `push: branches-ignore: [main]` (all feature branches)  
**Reason:** When a PR is open, both `push` and `pull_request` events fire for the same commit. Even with concurrency deduplication, GitHub registers the cancelled push run as a "not completed" check on the PR, polluting the merge UI with 4 cancelled checks alongside the successful PR checks.

**Consequence:** CI does not run on pushes to feature branches before a PR is opened. This is acceptable because the primary development flow is always branch → PR → squash merge.

### 2. Concurrency: `github.ref`

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

With a single event type per ref (`pull_request` uses `refs/pull/N/merge`, `push` to main uses `refs/heads/main`), `github.ref` uniquely identifies the run scope. A new push to the same PR cancels the previous in-progress run.

### 3. Docker runner: distroless instead of node:alpine

**Decision:** The production runner stage uses `gcr.io/distroless/nodejs24-debian13` instead of `node:24-alpine`.

**Reason:** Trivy (severity `HIGH,CRITICAL`, `ignore-unfixed: true`) flagged CVE-2026-33671 (picomatch ReDoS) located in `npm`'s internal `tinyglobby` dependency. This vulnerability lives inside npm itself and cannot be patched without an npm release.

Distroless images contain no shell, no package manager, and no npm — the entire `/usr/local/lib/node_modules/npm/` path does not exist, eliminating the vulnerability surface entirely.

**Rejected:** `trivy.ignore` / `skip-dirs` suppression — hides the problem without fixing it.

**Distroless specifics:**
- Base image: `gcr.io/distroless/nodejs24-debian13`
- Built-in non-root user: `nonroot` (uid 65532) — no need to `adduser`
- Entrypoint is `node` — `CMD` receives only the script path: `["dist/main.js"]`
- Builder stage runs `npm prune --omit=dev` before copying to runner

### 4. Trivy configuration

```yaml
severity: HIGH,CRITICAL
exit-code: "1"
ignore-unfixed: true
```

`ignore-unfixed: true` avoids blocking on CVEs with no available fix (upstream hasn't patched yet). This keeps the pipeline actionable rather than perpetually blocked on third-party delays.

## CI Job Summary

| Job | What it checks |
|-----|----------------|
| `lint` | ESLint (backend + frontend) |
| `test-unit` | Jest (backend, `--runInBand`) + Vitest (frontend, `--run`) |
| `test-integration` | Jest e2e with a real `postgres:16-alpine` service container |
| `security` | `npm audit --audit-level=critical` + Docker build + Trivy image scan |

All jobs use `jdx/mise-action@v3` to read `.mise.toml` (Node 24 pin) + `actions/setup-node@v4` for npm cache.

## Procedures

### Adding a new CI check
1. Add a new `job` in `.github/workflows/ci.yml`
2. Add `jdx/mise-action@v3` + `actions/setup-node@v4` steps at the top (copy from an existing job)
3. If the check must block merges: add it to branch protection required checks (GitHub → Settings → Branches → main → Edit)

### Trivy false positive / accepted risk
If a HIGH/CRITICAL CVE appears that is genuinely unfixable and accepted:
1. Create `.trivyignore` at repo root with the CVE ID and a comment justifying the acceptance
2. Document the acceptance in this ADR

### Updating the Node version
1. Update `.mise.toml` at repo root: `node = "X.Y.Z"`
2. Update `gcr.io/distroless/nodejsXX-debian13` in `backend/Dockerfile` runner stage
3. The CI reads `.mise.toml` automatically via `jdx/mise-action@v3`
