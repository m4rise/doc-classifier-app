# Infrastructure Setup Runbook

This runbook tracks provider setup for `doc-classifier-app`.

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

- [ ] Sentry project created: `doc-classifier-app-backend`
- [ ] DSN stored in GCP Secret Manager and GitHub Secrets

## 5. Grafana Cloud

- [ ] Stack created: `doc-classifier-app`
- [ ] Prometheus remote write configured
- [ ] Tempo OTLP endpoint configured
- [ ] Credentials stored in GCP Secret Manager

## 6. Google AI Studio

- [ ] Gemini API key created
- [ ] Key stored in GCP Secret Manager and GitHub Secrets
- [ ] Free-tier quotas reviewed

## 7. Secret Names (Reference)

### GCP Secret Manager

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `AES_ENCRYPTION_KEY`
- `GEMINI_API_KEY`
- `GCS_BUCKET_NAME`
- `GCS_PROJECT_ID`
- `SENTRY_DSN`
- `MCP_API_KEY`
- `OTLP_ENDPOINT`
- `CONFIDENCE_THRESHOLD`
- `FILE_SIZE_LIMIT_MB`

### GitHub Actions Secrets

- `WIF_PROVIDER`
- `WIF_SERVICE_ACCOUNT`
- `DATABASE_URL_STAGING`
- `DATABASE_URL_PROD`
- `FIREBASE_SERVICE_ACCOUNT`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `AES_ENCRYPTION_KEY`
- `GEMINI_API_KEY`
- `GCS_BUCKET_NAME`
- `GCS_PROJECT_ID`
- `SENTRY_DSN`
- `MCP_API_KEY`
- `OTLP_ENDPOINT`

## 8. Final Verification

- [ ] `backend/.env.example` matches required variable names
- [ ] No secret values committed
- [ ] Team can reproduce setup using this runbook only
