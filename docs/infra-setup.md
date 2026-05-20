# Infrastructure Setup Runbook

This runbook tracks provider setup for `doc-classifier-app`.

**Secret Management:**

- All sensitive variables are managed via GCP Secret Manager (prod/staging) and GitHub Actions secrets (CI/CD). Never commit secrets to source control.
- All environment variables required by the backend are listed in `backend/.env.example` (source of truth).

**CI/CD Authentication:**

- GitHub Actions uses Workload Identity Federation (WIF) to authenticate to GCP, with a dedicated service account and explicit IAM policies. No static keys are used.

**Grafana Cloud:**

- Access Policies are created with explicit scopes (metrics:write, traces:write, logs:write).
- API keys are generated for these policies and stored in GCP Secret Manager and GitHub Actions secrets.

## 1. Google Cloud Platform

- [x] Project created: `doc-classifier-app`
- [x] APIs enabled:
  - [x] Cloud Run Admin API
  - [x] Artifact Registry API
  - [x] Cloud Storage API
  - [x] Secret Manager API
  - [x] IAM API
- [x] GCS bucket created: `doc-classifier-documents`
  - [x] Uniform bucket-level access enabled
  - [x] Public access prevention enabled
- [x] CI service account created: `github-actions@doc-classifier-app.iam.gserviceaccount.com`
- [x] IAM roles granted:
  - [x] Cloud Run Admin
  - [x] Storage Admin
  - [x] Artifact Registry Writer
  - [x] Secret Manager Accessor
- [x] Workload Identity Federation configured (OIDC)

## 2. Neon.tech

- [x] Project created: `doc-classifier-app`
- [x] Branch: `main` (prod)
- [x] Connection string generated: `DATABASE_URL` (direct, non-pooled)
- [x] Connection string params:
  - [x] `connection_limit=2`
  - [x] `pool_timeout=10`

## 3. Firebase

Target architecture: 3 projects (dev/staging/prod).

- [x] `doc-classifier-app`
- [x] Hosting initialized on each project (SPA rewrite to `/index.html`)
- [x] Firebase service account JSON ready for CI secret

MVP optimization (optional):

- Use single project `doc-classifier-app` first, then split to 3 projects before production hardening.

## 4. Sentry

- [x] Sentry project created: `doc-classifier-app-backend`
- [x] DSN stored in GCP Secret Manager and GitHub Secrets

## 5. Grafana Cloud

- [x] Stack created: `doc-classifier-app`
- [x] Prometheus remote write configured
- [x] Tempo OTLP endpoint configured
- [x] Access Policy created with explicit scopes (metrics:write, traces:write, logs:write)
- [x] API key generated for this policy
- [x] Credentials stored in GCP Secret Manager and GitHub Actions secrets

## 6. Google AI Studio

- [x] Gemini API key created
- [x] Key stored in GCP Secret Manager and GitHub Secrets
- [x] Free-tier quotas reviewed

## 7. Environment Variables & Secrets (Reference)

### GCP Secret Manager — runtime secrets `[SECRET]`

Fetched by Cloud Run at startup via `--set-secrets`.
Also fetched by GitHub Actions via WIF during the deploy step — no manual mirroring needed.

- `DATABASE_URL` — Neon prod connection string
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `AES_ENCRYPTION_KEY`
- `GEMINI_API_KEY`
- `MCP_API_KEY`
- `SENTRY_DSN`
- `OTEL_EXPORTER_OTLP_ENDPOINT`
- `GRAFANA_INSTANCE_ID`
- `GRAFANA_API_KEY` — Access Policy token (scopes: metrics:write, traces:write, logs:write)

### Cloud Run `--set-env-vars` — non-sensitive config `[CONFIG]`

Not stored in Secret Manager. Passed directly at deploy time.

- `GCS_BUCKET_NAME`
- `GCS_PROJECT_ID`
- `OTEL_SERVICE_NAME`
- `OTEL_RESOURCE_ATTRIBUTES`
- `OTEL_TRACES_EXPORTER`
- `OTEL_METRICS_EXPORTER`
- `OTEL_LOGS_EXPORTER`
- `THROTTLE_TTL`
- `THROTTLE_LIMIT`
- `CONFIDENCE_THRESHOLD`
- `FILE_SIZE_LIMIT_MB`

### GitHub Actions Secrets — CI/CD bootstrap only

These cannot be fetched from GCP Secret Manager — they are needed before any GCP auth.

- `WIF_PROVIDER` — GCP OIDC provider resource name
- `WIF_SERVICE_ACCOUNT` — service account email for OIDC impersonation
- `GCP_PROJECT_ID` — GCP project ID (Artifact Registry + Cloud Run)
- `GCP_REGION` — GCP region (e.g. `europe-west1`)
- `CLOUD_RUN_SERVICE` — Cloud Run service name
- `DATABASE_URL_PROD` — `prisma migrate deploy` against Neon prod
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — real token signing in integration tests
- `FIREBASE_SERVICE_ACCOUNT` — Firebase Hosting deploy (service account JSON)
- `FIREBASE_PROJECT_ID` — Firebase project ID

## 8. CI/CD Pipeline

Two separate GitHub Actions workflows:

| Workflow | File                           | Trigger                     | Purpose                           |
| -------- | ------------------------------ | --------------------------- | --------------------------------- |
| CI       | `.github/workflows/ci.yml`     | push (non-main) + PR → main | lint, unit, integration, security |
| Deploy   | `.github/workflows/deploy.yml` | CI passes on main           | deploy backend + frontend         |

**Deploy flow (on merge to main):**

1. `deploy-backend` job:
   - `npx prisma migrate deploy` with `DATABASE_URL_PROD` (migrations before new revision)
   - GCP OIDC auth via Workload Identity Federation (no static JSON key)
   - Docker build+push to Artifact Registry
   - `google-github-actions/deploy-cloudrun@v2` → new Cloud Run revision
2. `deploy-frontend` job (parallel to backend):
   - `npm run build` (Vue/Vite SPA)
   - `FirebaseExtended/action-hosting-deploy@v0` → Firebase Hosting live channel

**Image tag:** `{GCP_REGION}-docker.pkg.dev/{GCP_PROJECT_ID}/backend/doc-classifier-backend:{git_sha}`

## 9. Final Verification

- [x] `backend/.env.example` matches required variable names
- [x] No secret values committed
- [x] Team can reproduce setup using this runbook only
