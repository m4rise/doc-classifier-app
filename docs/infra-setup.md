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
- [x] Branches created:
  - [x] `main` (prod)
- [x] Connection strings generated:
  - [x] `DATABASE_URL`
- [x] Connection string includes params:
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

- [ ] Gemini API key created
- [ ] Key stored in GCP Secret Manager and GitHub Secrets
- [ ] Free-tier quotas reviewed

## 7. Environment Variables & Secrets (Reference)

### GCP Secret Manager / GitHub Actions Secrets

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `AES_ENCRYPTION_KEY`
- `GEMINI_API_KEY`
- `GCS_BUCKET_NAME`
- `GCS_PROJECT_ID`
- `SENTRY_DSN`
- `MCP_API_KEY`
- `OTEL_EXPORTER_OTLP_ENDPOINT`
- `GRAFANA_API_KEY`
- `GRAFANA_INSTANCE_ID`
- `OTEL_SERVICE_NAME`
- `OTEL_RESOURCE_ATTRIBUTES`
- `OTEL_TRACES_EXPORTER`
- `OTEL_METRICS_EXPORTER`
- `OTEL_LOGS_EXPORTER`
- `CONFIDENCE_THRESHOLD`
- `FILE_SIZE_LIMIT_MB`
- `FILE_SIZE_LIMIT_MB`

### GitHub Actions Secrets

- `WIF_PROVIDER`
- `WIF_SERVICE_ACCOUNT`
- `DATABASE_URL_STAGING`
- `DATABASE_URL_PROD`
- `FIREBASE_SERVICE_ACCOUNT`
- (plus all secrets listed above as needed for CI/CD)

## 8. Final Verification

- [ ] `backend/.env.example` matches required variable names
- [ ] No secret values committed
- [ ] Team can reproduce setup using this runbook only
