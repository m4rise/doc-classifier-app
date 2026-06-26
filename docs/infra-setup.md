# Infrastructure Setup Runbook

This runbook tracks provider setup for `doc-classifier-app`.

**Secret management**

- All sensitive runtime values are managed via GCP Secret Manager.
- GitHub Actions keeps only bootstrap and release secrets required before GCP auth.
- Backend variable names are defined in `backend/.env.example`.

**CI/CD authentication**

- GitHub Actions uses Workload Identity Federation (WIF) to authenticate to GCP.
- No static deploy key or Firebase service account JSON is required for deploy.

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
- [ ] Cloud Run runtime service account IAM verified:
  - [ ] Storage Object User on `doc-classifier-documents`
  - [ ] Service Account Token Creator for signed URLs (`iam.serviceAccounts.signBlob`)
- [x] Workload Identity Federation configured

## 2. Neon.tech

- [x] Project created: `doc-classifier-app`
- [x] Branch: `main`
- [x] Connection string generated: `DATABASE_URL` (direct, non-pooled)

## 3. Firebase

- [x] Project created: `doc-classifier-app`
- [x] Hosting initialized
- [x] Frontend deploy wired through WIF-backed GitHub Actions auth

## 4. Sentry

- [x] Sentry project created: `doc-classifier-app-backend`
- [x] DSN stored in GCP Secret Manager

## 5. Grafana Cloud

- [x] Stack created: `doc-classifier-app`
- [x] OTLP endpoint configured
- [x] Access policy created with metrics/traces/logs write scopes
- [x] Credentials stored in GCP Secret Manager

## 6. Google AI Studio

- [x] Gemini API key created
- [x] Key stored in GCP Secret Manager

## 7. Environment variables and secrets

### GCP Secret Manager runtime secrets `[SECRET]`

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `AES_ENCRYPTION_KEY`
- `GEMINI_API_KEY`
- `MCP_API_KEY`
- `SENTRY_DSN`
- `OTEL_EXPORTER_OTLP_ENDPOINT`
- `GRAFANA_INSTANCE_ID`
- `GRAFANA_API_KEY`

### Cloud Run `--set-env-vars` config `[CONFIG]`

- `GCS_BUCKET_NAME`
- `GCS_PROJECT_ID`
- `PRISMA_POOL_MAX`
- `PRISMA_POOL_CONNECTION_TIMEOUT_MS`
- `JWT_ACCESS_TOKEN_TTL_SECONDS`
- `JWT_REFRESH_TOKEN_TTL_SECONDS`
- `ARGON2_TIME_COST`
- `ARGON2_MEMORY_COST_KIB`
- `ARGON2_PARALLELISM`
- `FILE_STORAGE_DRIVER`
- `DOCUMENT_DOWNLOAD_URL_TTL_SECONDS`
- `DOCUMENT_LIST_DEFAULT_LIMIT`
- `DOCUMENT_LIST_MAX_LIMIT`
- `GEMINI_MODEL`
- `GEMINI_TIMEOUT_MS`
- `OTEL_SERVICE_NAME`
- `OTEL_RESOURCE_ATTRIBUTES`
- `OTEL_TRACES_EXPORTER`
- `OTEL_METRICS_EXPORTER`
- `OTEL_LOGS_EXPORTER`
- `THROTTLE_TTL`
- `THROTTLE_LIMIT`
- `THROTTLE_AUTH_TTL`
- `THROTTLE_AUTH_LIMIT`
- `THROTTLE_AUTH_SESSION_TTL`
- `THROTTLE_AUTH_SESSION_LIMIT`
- `THROTTLE_REGISTER_TTL`
- `THROTTLE_REGISTER_LIMIT`
- `THROTTLE_UPLOAD_TTL`
- `THROTTLE_UPLOAD_LIMIT`
- `CONFIDENCE_THRESHOLD`
- `FILE_SIZE_LIMIT_MB`
- `TOS_VERSION`

### GitHub Actions secrets

- `DATABASE_URL_PROD` in environment `production-backend`
- `WIF_PROVIDER` at repo level
- `WIF_SERVICE_ACCOUNT` at repo level
- additional repo-level CI/release secrets as needed:
  - `CODECOV_TOKEN`
  - `RELEASE_TOKEN`
  - `SPECS_REPO_PAT`

### GitHub Actions variables

- `GCP_PROJECT_ID`
- `GCP_REGION`
- `CLOUD_RUN_SERVICE`
- `GCS_BUCKET_NAME`
- `FIREBASE_PROJECT_ID`

## 8. CI/CD pipeline

Four GitHub Actions workflows are in use:

| Workflow          | File                                   | Trigger                               | Purpose                                     |
| ----------------- | -------------------------------------- | ------------------------------------- | ------------------------------------------- |
| CI                | `.github/workflows/ci.yml`             | PR -> main, app-relevant push -> main | lint, unit, integration, e2e, security      |
| Deploy Staging    | `.github/workflows/staging-deploy.yml` | CI passes on main, gated by variable  | optional staging train                      |
| Release           | `.github/workflows/release.yml`        | manual dispatch from main             | semantic-release for selected release train |
| Deploy Production | `.github/workflows/deploy.yml`         | release published or manual dispatch  | deploy selected release/ref to production   |

Production deploy flow:

1. `deploy-backend`
   - checks out the release/manual ref
   - generates Prisma client with `DATABASE_URL_PROD`
   - runs `prisma migrate deploy`
   - authenticates to GCP via WIF
   - builds and pushes Docker image
   - deploys Cloud Run with runtime secrets and non-sensitive env vars
2. `deploy-frontend`
   - checks out the release/manual ref
   - builds frontend
   - authenticates to GCP via WIF
   - deploys Firebase Hosting via `firebase deploy --only hosting`

Staging deploy is disabled by default until `ENABLE_STAGING_DEPLOY=true` and the
staging variables/secrets listed in `docs/ci-cd-secrets.md` are configured.

## 9. Final verification

- [x] `backend/.env.example` matches backend variable names
- [x] Runtime secrets are stored in GCP Secret Manager
- [x] GitHub Actions bootstrap secrets and variables are documented separately
