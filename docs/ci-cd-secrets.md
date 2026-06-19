# CI/CD Secrets & Variables - Setup Guide

Complete reference for every key used by the CI/CD pipeline.
Canonical source of truth for backend variable names: `backend/.env.example`.

---

## Variable mapping: app names vs pipeline names

Some variables have different names in the app vs in the pipeline. The deploy
workflow handles the translation:

| App variable (Cloud Run env) | Source                      | Pipeline reference                            | Notes                              |
| ---------------------------- | --------------------------- | --------------------------------------------- | ---------------------------------- |
| `GCS_PROJECT_ID`             | `vars.GCP_PROJECT_ID`       | `GCS_PROJECT_ID=${{ vars.GCP_PROJECT_ID }}`   | Same value, different names        |
| `GCS_BUCKET_NAME`            | `vars.GCS_BUCKET_NAME`      | `GCS_BUCKET_NAME=${{ vars.GCS_BUCKET_NAME }}` | Same name in both                  |
| `DATABASE_URL`               | GCP Secret Manager          | `DATABASE_URL=DATABASE_URL:latest`            | prod DB, injected at runtime       |
| `DATABASE_URL` (migrations)  | `secrets.DATABASE_URL_PROD` | env var in prisma migrate step                | GH secret, used only by deploy job |
| `FILE_STORAGE_DRIVER`        | literal deploy config       | `FILE_STORAGE_DRIVER=gcs`                     | Cloud Run uses GCS storage         |

Runtime IAM prerequisite: the Cloud Run runtime service account must be allowed
to create/read objects in `GCS_BUCKET_NAME`. If the backend uses signed URLs,
the same service account also needs `iam.serviceAccounts.signBlob` via
`roles/iam.serviceAccountTokenCreator`.

---

## Complete key map

> GitHub Actions storage:
>
> - deploy bootstrap secrets can live either at repo level or in the workflow
>   environment that consumes them
> - in the current project setup, `DATABASE_URL_PROD` lives in
>   `production-backend`
> - staging deploy is disabled until `ENABLE_STAGING_DEPLOY=true`
> - repo-level variables live in Settings -> Secrets and variables -> Actions
>   -> Variables

| Key                           | Local `.env` | GCP Secret Manager | Cloud Run env            | GH Secret | GH Variable | Description                                                                               |
| ----------------------------- | :----------: | :----------------: | ------------------------ | :-------: | :---------: | ----------------------------------------------------------------------------------------- |
| `DATABASE_URL`                |      ✅      |         ✅         | via `--set-secrets`      |           |             | Production database connection string used by the backend at runtime.                     |
| `DATABASE_URL_PROD`           |              |                    |                          |    ✅     |             | Production database connection string used only by `prisma migrate deploy` in deploy job. |
| `NODE_ENV`                    |      ✅      |                    | ✅ `=production`         |           |             | Node.js environment.                                                                      |
| `PORT`                        |      ✅      |                    | ✅ `=3000`               |           |             | Backend listen port.                                                                      |
| `JWT_ACCESS_SECRET`           |      ✅      |         ✅         | via `--set-secrets`      |           |             | Secret for signing JWT access tokens.                                                     |
| `JWT_REFRESH_SECRET`          |      ✅      |         ✅         | via `--set-secrets`      |           |             | Secret for signing JWT refresh tokens.                                                    |
| `AES_ENCRYPTION_KEY`          |      ✅      |         ✅         | via `--set-secrets`      |           |             | AES-256 key for encryption at rest.                                                       |
| `GCS_BUCKET_NAME`             |      ✅      |                    | ✅                       |           |     ✅      | Google Cloud Storage bucket for document uploads.                                         |
| `GCS_PROJECT_ID`              |      ✅      |                    | ✅ from `GCP_PROJECT_ID` |           |             | GCP project ID injected into the app under the name `GCS_PROJECT_ID`.                     |
| `FILE_STORAGE_DRIVER`         |      ✅      |                    | ✅ `=gcs`                |           |             | Storage backend selector. Use `local` for dev/test and `gcs` for Cloud Run.               |
| `LOCAL_UPLOAD_DIR`            |      ✅      |                    |                          |           |             | Local-only upload directory used only when `FILE_STORAGE_DRIVER=local`.                   |
| `GEMINI_API_KEY`              |      ✅      |         ✅         | via `--set-secrets`      |           |             | API key for Google Gemini features.                                                       |
| `GEMINI_MODEL`                |      ✅      |                    | ✅ `=gemini-3.5-flash`   |           |             | Gemini model used by the LLM provider.                                                    |
| `GEMINI_TIMEOUT_MS`           |      ✅      |                    | ✅ `=8000`               |           |             | Gemini analysis timeout in milliseconds.                                                  |
| `MCP_API_KEY`                 |      ✅      |         ✅         | via `--set-secrets`      |           |             | Static API key for MCP authentication.                                                    |
| `SENTRY_DSN`                  |      ✅      |         ✅         | via `--set-secrets`      |           |             | Sentry DSN for backend error reporting.                                                   |
| `OTEL_EXPORTER_OTLP_ENDPOINT` |      ✅      |         ✅         | via `--set-secrets`      |           |             | OTLP endpoint for OpenTelemetry export.                                                   |
| `GRAFANA_INSTANCE_ID`         |      ✅      |         ✅         | via `--set-secrets`      |           |             | Grafana Cloud instance ID.                                                                |
| `GRAFANA_API_KEY`             |      ✅      |         ✅         | via `--set-secrets`      |           |             | Grafana Cloud API key.                                                                    |
| `OTEL_SERVICE_NAME`           |      ✅      |                    | ✅                       |           |             | OpenTelemetry service name.                                                               |
| `OTEL_RESOURCE_ATTRIBUTES`    |      ✅      |                    | ✅                       |           |             | OpenTelemetry resource attributes.                                                        |
| `OTEL_TRACES_EXPORTER`        |      ✅      |                    | ✅                       |           |             | OTEL traces exporter.                                                                     |
| `OTEL_METRICS_EXPORTER`       |      ✅      |                    | ✅                       |           |             | OTEL metrics exporter.                                                                    |
| `OTEL_LOGS_EXPORTER`          |      ✅      |                    | ✅                       |           |             | OTEL logs exporter.                                                                       |
| `THROTTLE_TTL`                |      ✅      |                    | ✅ `=60`                 |           |             | Rate-limit window in seconds.                                                             |
| `THROTTLE_LIMIT`              |      ✅      |                    | ✅ `=100`                |           |             | Maximum requests per IP per window.                                                       |
| `THROTTLE_AUTH_TTL`           |      ✅      |                    | ✅ `=60`                 |           |             | Login rate-limit window in seconds.                                                       |
| `THROTTLE_AUTH_LIMIT`         |      ✅      |                    | ✅ `=10`                 |           |             | Maximum login attempts per IP per auth window.                                            |
| `THROTTLE_AUTH_SESSION_TTL`   |      ✅      |                    | ✅ `=60`                 |           |             | Authenticated session rate-limit window in seconds.                                       |
| `THROTTLE_AUTH_SESSION_LIMIT` |      ✅      |                    | ✅ `=60`                 |           |             | Maximum auth session requests per user/IP per window.                                     |
| `THROTTLE_REGISTER_TTL`       |      ✅      |                    | ✅ `=60`                 |           |             | Register rate-limit window in seconds.                                                    |
| `THROTTLE_REGISTER_LIMIT`     |      ✅      |                    | ✅ `=5`                  |           |             | Maximum register attempts per IP per register window.                                     |
| `THROTTLE_UPLOAD_TTL`         |      ✅      |                    | ✅ `=60`                 |           |             | Upload rate-limit window in seconds.                                                      |
| `THROTTLE_UPLOAD_LIMIT`       |      ✅      |                    | ✅ `=10`                 |           |             | Maximum upload attempts per user/IP per upload window.                                    |
| `CONFIDENCE_THRESHOLD`        |      ✅      |                    | ✅ `=0.7`                |           |             | Minimum AI confidence score for auto-validation.                                          |
| `FILE_SIZE_LIMIT_MB`          |      ✅      |                    | ✅ `=10`                 |           |             | Maximum upload file size in MB.                                                           |
| `TOS_VERSION`                 |      ✅      |                    | ✅ `=1.0`                |           |             | Current Terms of Service version required at registration.                                |
| `WIF_PROVIDER`                |              |                    |                          |    ✅     |             | GCP OIDC provider resource name for Workload Identity Federation.                         |
| `WIF_SERVICE_ACCOUNT`         |              |                    |                          |    ✅     |             | GCP service account email used by GitHub Actions via OIDC.                                |
| `GCP_PROJECT_ID`              |              |                    |                          |           |     ✅      | GCP project ID used for image tags, registry path, and Cloud Run config.                  |
| `GCP_REGION`                  |              |                    |                          |           |     ✅      | GCP region for Cloud Run and Artifact Registry.                                           |
| `CLOUD_RUN_SERVICE`           |              |                    |                          |           |     ✅      | Cloud Run backend service name.                                                           |
| `FIREBASE_PROJECT_ID`         |              |                    |                          |           |     ✅      | Firebase project ID used by the frontend deploy job.                                      |

Staging-specific additions used by `.github/workflows/staging-deploy.yml`:

| Key                           | Storage / source      | Description                                                                |
| ----------------------------- | --------------------- | -------------------------------------------------------------------------- |
| `ENABLE_STAGING_DEPLOY`       | GH variable           | Set to `true` to enable automatic staging deploy after successful CI.      |
| `DATABASE_URL_STAGING`        | GH environment secret | Staging database connection string used only by `prisma migrate deploy`.   |
| `*_STAGING` runtime secrets   | GCP Secret Manager    | Staging runtime secret resources, for example `JWT_ACCESS_SECRET_STAGING`. |
| `GCP_STAGING_PROJECT_ID`      | GH variable, optional | Staging GCP project. Falls back to `GCP_PROJECT_ID` when empty.            |
| `GCP_STAGING_REGION`          | GH variable, optional | Staging GCP region. Falls back to `GCP_REGION` when empty.                 |
| `CLOUD_RUN_STAGING_SERVICE`   | GH variable           | Staging Cloud Run backend service name.                                    |
| `GCS_STAGING_BUCKET_NAME`     | GH variable           | Staging GCS bucket name injected into Cloud Run.                           |
| `FIREBASE_STAGING_PROJECT_ID` | GH variable           | Firebase project ID used by staging frontend deploy.                       |

> Note:
>
> - `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are not GitHub secrets for CI;
>   integration and e2e tests run against local Postgres with `NODE_ENV=test`
> - `FIREBASE_SERVICE_ACCOUNT` is not needed; frontend deploy uses Workload
>   Identity Federation as well

---

## 1. GCP Secret Manager

Prerequisites: `gcloud auth login` and `gcloud config set project YOUR_PROJECT_ID`

### Create secrets

```bash
PROJECT=doc-classifier-app

secret_set() {
  local name=$1 value=$2
  if gcloud secrets describe "$name" --project="$PROJECT" &>/dev/null; then
    echo -n "$value" | gcloud secrets versions add "$name" --data-file=- --project="$PROJECT"
  else
    echo -n "$value" | gcloud secrets create "$name" --data-file=- --project="$PROJECT"
  fi
}

secret_set DATABASE_URL "postgresql://..."
secret_set JWT_ACCESS_SECRET  "$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")"
secret_set JWT_REFRESH_SECRET "$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")"
secret_set AES_ENCRYPTION_KEY "$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
secret_set GEMINI_API_KEY "YOUR_GEMINI_KEY"
secret_set MCP_API_KEY "$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")"
secret_set SENTRY_DSN "https://...@sentry.io/..."
secret_set OTEL_EXPORTER_OTLP_ENDPOINT "https://otlp-gateway-prod-gb-south-1.grafana.net/otlp"
secret_set GRAFANA_INSTANCE_ID "YOUR_INSTANCE_ID"
secret_set GRAFANA_API_KEY "YOUR_GRAFANA_API_KEY"
```

### Verify

```bash
gcloud secrets list --project="$PROJECT"
gcloud secrets versions access latest --secret=DATABASE_URL --project="$PROJECT"
```

Expected in the current setup: 10 runtime secrets.

---

## 2. GitHub Actions secrets

Current project setup:

- `DATABASE_URL_PROD` in environment `production-backend`
- `DATABASE_URL_STAGING` in environment `staging-backend` when staging deploy is
  enabled
- `WIF_PROVIDER` at repo level
- `WIF_SERVICE_ACCOUNT` at repo level
- additional repo-level CI/release secrets may exist independently (`CODECOV_TOKEN`,
  `RELEASE_TOKEN`, `SPECS_REPO_PAT`)

Examples:

```bash
REPO="m4rise/doc-classifier-app"

gh secret set DATABASE_URL_PROD --env production-backend --repo "$REPO"
gh secret set DATABASE_URL_STAGING --env staging-backend --repo "$REPO"
gh secret set WIF_PROVIDER --repo "$REPO"
gh secret set WIF_SERVICE_ACCOUNT --repo "$REPO"
```

### Verify

```bash
gh secret list --env production-backend --repo "$REPO"
gh secret list --env staging-backend --repo "$REPO"
gh secret list --repo "$REPO"
```

---

## 3. GitHub Actions variables

These are non-sensitive repo-level variables:

```bash
REPO="m4rise/doc-classifier-app"

gh variable set GCP_PROJECT_ID --body "doc-classifier-app" --repo "$REPO"
gh variable set GCP_REGION --body "europe-west1" --repo "$REPO"
gh variable set CLOUD_RUN_SERVICE --body "doc-classifier-backend" --repo "$REPO"
gh variable set GCS_BUCKET_NAME --body "doc-classifier-documents" --repo "$REPO"
gh variable set FIREBASE_PROJECT_ID --body "doc-classifier-app" --repo "$REPO"
```

Optional staging variables:

```bash
gh variable set ENABLE_STAGING_DEPLOY --body "false" --repo "$REPO"
gh variable set CLOUD_RUN_STAGING_SERVICE --body "doc-classifier-backend-staging" --repo "$REPO"
gh variable set GCS_STAGING_BUCKET_NAME --body "doc-classifier-documents-staging" --repo "$REPO"
gh variable set FIREBASE_STAGING_PROJECT_ID --body "doc-classifier-app-staging" --repo "$REPO"

# Optional when staging uses a separate GCP project or region:
gh variable set GCP_STAGING_PROJECT_ID --body "doc-classifier-app-staging" --repo "$REPO"
gh variable set GCP_STAGING_REGION --body "europe-west1" --repo "$REPO"
```

---

## 4. Cloud Run non-sensitive config

The backend deploy injects these as `env_vars` with `env_vars_update_strategy: overwrite`:

- `NODE_ENV=production`
- `FILE_STORAGE_DRIVER=gcs`
- `GCS_PROJECT_ID=${{ vars.GCP_PROJECT_ID }}`
- `GCS_BUCKET_NAME=${{ vars.GCS_BUCKET_NAME }}`
- `GEMINI_MODEL=gemini-3.5-flash`
- `GEMINI_TIMEOUT_MS=8000`
- `OTEL_SERVICE_NAME=doc-classifier-app-backend`
- `OTEL_RESOURCE_ATTRIBUTES="service.namespace=production,deployment.environment=production"`
- `OTEL_TRACES_EXPORTER=otlp`
- `OTEL_METRICS_EXPORTER=otlp`
- `OTEL_LOGS_EXPORTER=otlp`
- `THROTTLE_TTL=60`
- `THROTTLE_LIMIT=100`
- `THROTTLE_AUTH_TTL=60`
- `THROTTLE_AUTH_LIMIT=10`
- `THROTTLE_AUTH_SESSION_TTL=60`
- `THROTTLE_AUTH_SESSION_LIMIT=60`
- `THROTTLE_REGISTER_TTL=60`
- `THROTTLE_REGISTER_LIMIT=5`
- `THROTTLE_UPLOAD_TTL=60`
- `THROTTLE_UPLOAD_LIMIT=10`
- `CONFIDENCE_THRESHOLD=0.7`
- `FILE_SIZE_LIMIT_MB=10`
- `TOS_VERSION=1.0`

Staging uses the same non-sensitive config shape with `NODE_ENV=staging`,
`GCS_STAGING_BUCKET_NAME`, and staging-specific Secret Manager resources.

If business config changes, update `backend/.env.example`,
`.github/workflows/deploy.yml`, and `.github/workflows/staging-deploy.yml`.

---

## 5. Quick verification checklist

```bash
PROJECT=doc-classifier-app
REPO="m4rise/doc-classifier-app"

echo "=== GCP Secrets ==="
gcloud secrets list --project="$PROJECT" --format="value(name)" | sort

echo ""
echo "=== GitHub repo secrets ==="
gh secret list --repo "$REPO"

echo ""
echo "=== GitHub env secrets (production-backend) ==="
gh secret list --env production-backend --repo "$REPO"

echo ""
echo "=== GitHub env secrets (staging-backend, optional) ==="
gh secret list --env staging-backend --repo "$REPO"

echo ""
echo "=== GitHub variables ==="
gh variable list --repo "$REPO"
```
