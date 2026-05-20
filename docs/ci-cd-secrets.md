# CI/CD Secrets & Variables — Setup Guide

Complete reference for every key used by the CI/CD pipeline.
Canonical source of truth for variable names: `backend/.env.example`.

---

## Variable mapping: app names vs pipeline names

Some variables have different names in the app vs in the pipeline. The deploy.yml handles the translation:

| App variable (Cloud Run env) | Source | Pipeline reference | Notes |
|---|---|---|---|
| `GCS_PROJECT_ID` | `vars.GCP_PROJECT_ID` | `GCS_PROJECT_ID=${{ vars.GCP_PROJECT_ID }}` | Same value, different names |
| `GCS_BUCKET_NAME` | `vars.GCS_BUCKET_NAME` | `GCS_BUCKET_NAME=${{ vars.GCS_BUCKET_NAME }}` | Same name in both |
| `DATABASE_URL` | GCP Secret Manager | `DATABASE_URL=DATABASE_URL:latest` | prod DB, injected at runtime |
| `DATABASE_URL` (migrations) | `secrets.DATABASE_URL_PROD` | env var in prisma migrate step | GH secret, used only by deploy job |

---

## Complete Key Map

> **GitHub secrets location**: all `[GH_SECRET]` entries live in the **`production` environment**
> (Settings → Environments → production → Secrets), not at repo level.
> `[GH_VAR]` entries are at **repo level** (Settings → Secrets and variables → Actions → Variables).

| Key | Local `.env` | GCP Secret Manager | Cloud Run env | GH Secret (env: production) | GH Variable (repo) |
|---|:---:|:---:|:---:|:---:|:---:|
| `DATABASE_URL` | ✅ | ✅ | via `--set-secrets` | | |
| `DATABASE_URL_PROD` | | | | ✅ | |
| `NODE_ENV` | ✅ | | ✅ `=production` | | |
| `PORT` | ✅ | | ✅ `=3000` | | |
| `JWT_ACCESS_SECRET` | ✅ | ✅ | via `--set-secrets` | | |
| `JWT_REFRESH_SECRET` | ✅ | ✅ | via `--set-secrets` | | |
| `AES_ENCRYPTION_KEY` | ✅ | ✅ | via `--set-secrets` | | |
| `GCS_BUCKET_NAME` | ✅ | | ✅ | | ✅ |
| `GCS_PROJECT_ID` | ✅ | | ✅ (← `GCP_PROJECT_ID`) | | |
| `GEMINI_API_KEY` | ✅ | ✅ | via `--set-secrets` | | |
| `MCP_API_KEY` | ✅ | ✅ | via `--set-secrets` | | |
| `SENTRY_DSN` | ✅ | ✅ | via `--set-secrets` | | |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | ✅ | ✅ | via `--set-secrets` | | |
| `GRAFANA_INSTANCE_ID` | ✅ | ✅ | via `--set-secrets` | | |
| `GRAFANA_API_KEY` | ✅ | ✅ | via `--set-secrets` | | |
| `OTEL_SERVICE_NAME` | ✅ | | ✅ | | |
| `OTEL_RESOURCE_ATTRIBUTES` | ✅ | | ✅ | | |
| `OTEL_TRACES_EXPORTER` | ✅ | | ✅ | | |
| `OTEL_METRICS_EXPORTER` | ✅ | | ✅ | | |
| `OTEL_LOGS_EXPORTER` | ✅ | | ✅ | | |
| `THROTTLE_TTL` | ✅ | | ✅ `=60` | | |
| `THROTTLE_LIMIT` | ✅ | | ✅ `=100` | | |
| `CONFIDENCE_THRESHOLD` | ✅ | | ✅ `=0.7` | | |
| `FILE_SIZE_LIMIT_MB` | ✅ | | ✅ `=10` | | |
| `WIF_PROVIDER` | | | | ✅ | |
| `WIF_SERVICE_ACCOUNT` | | | | ✅ | |
| `GCP_PROJECT_ID` | | | | | ✅ |
| `GCP_REGION` | | | | | ✅ |
| `CLOUD_RUN_SERVICE` | | | | | ✅ |
| `GCS_BUCKET_NAME` (GH var) | | | | | ✅ |
| `FIREBASE_PROJECT_ID` | | | | | ✅ |

> **Note**: `FIREBASE_SERVICE_ACCOUNT` (JSON key) is **not needed** — Firebase Hosting deploy
> uses the same WIF service account as the backend (`github-actions@...` has `Administrateur Firebase Hosting` role).
> `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` are **not GitHub secrets** — CI integration tests
> use a local postgres with hardcoded credentials and do not require JWT secrets.

---

## 1. GCP Secret Manager

> Prerequisites: `gcloud auth login` + `gcloud config set project YOUR_PROJECT_ID`

### Create secrets

```bash
PROJECT=doc-classifier-app   # adjust if different

# Helper: create or update a secret from stdin
secret_set() {
  local name=$1 value=$2
  if gcloud secrets describe "$name" --project="$PROJECT" &>/dev/null; then
    echo -n "$value" | gcloud secrets versions add "$name" --data-file=- --project="$PROJECT"
  else
    echo -n "$value" | gcloud secrets create "$name" --data-file=- --project="$PROJECT"
  fi
}

secret_set DATABASE_URL          "postgresql://..."
secret_set JWT_ACCESS_SECRET     "$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")"
secret_set JWT_REFRESH_SECRET    "$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")"
secret_set AES_ENCRYPTION_KEY    "$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
secret_set GEMINI_API_KEY        "YOUR_GEMINI_KEY"
secret_set MCP_API_KEY           "$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")"
secret_set SENTRY_DSN            "https://...@sentry.io/..."
secret_set OTEL_EXPORTER_OTLP_ENDPOINT "https://otlp-gateway-prod-gb-south-1.grafana.net/otlp"
secret_set GRAFANA_INSTANCE_ID   "YOUR_INSTANCE_ID"
secret_set GRAFANA_API_KEY       "YOUR_GRAFANA_API_KEY"
```

### Verify

```bash
gcloud secrets list --project="$PROJECT"
# Expected: 10 secrets listed

# Spot-check one value
gcloud secrets versions access latest --secret=DATABASE_URL --project="$PROJECT"
```

### IAM — grant Cloud Run access

The Cloud Run runtime SA must be able to read the secrets:

```bash
SA="github-actions@${PROJECT}.iam.gserviceaccount.com"
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"  # Cloud Run runtime SA

for secret in DATABASE_URL JWT_ACCESS_SECRET JWT_REFRESH_SECRET AES_ENCRYPTION_KEY \
              GEMINI_API_KEY MCP_API_KEY SENTRY_DSN OTEL_EXPORTER_OTLP_ENDPOINT \
              GRAFANA_INSTANCE_ID GRAFANA_API_KEY; do
  gcloud secrets add-iam-policy-binding "$secret" \
    --member="serviceAccount:${RUNTIME_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --project="$PROJECT"
done
```

> Alternatively, grant `roles/secretmanager.secretAccessor` at the project level to the Compute Engine default SA — simpler for development.

---

## 2. GitHub Actions — Secrets (environment: production)

> Prerequisites: `gh auth login` with repo access.
> All secrets below live in the **`production` environment**, not at repo level.

```bash
REPO="m4rise/doc-classifier-app"

# GCP OIDC auth (used by both deploy-backend and deploy-frontend jobs)
gh secret set WIF_PROVIDER         --env production --repo "$REPO"
# → projects/70770966880/locations/global/workloadIdentityPools/github-actions-pool/providers/github-actions-provider

gh secret set WIF_SERVICE_ACCOUNT  --env production --repo "$REPO"
# → github-actions@doc-classifier-app.iam.gserviceaccount.com

# Database — used only by prisma migrate deploy step in the deploy job
# (NOT the same as the DATABASE_URL secret in GCP Secret Manager)
gh secret set DATABASE_URL_PROD    --env production --repo "$REPO"
# → postgresql://... (Neon prod direct URL, non-pooled)
```

### Verify

```bash
gh secret list --env production --repo "$REPO"
# Expected: DATABASE_URL_PROD, WIF_PROVIDER, WIF_SERVICE_ACCOUNT  (3 secrets)
```

---

## 3. GitHub Actions — Variables (repo level)

> Variables are non-sensitive and live at **repo level** (not environment-scoped).
> They are accessible via `vars.*` in all jobs, including those using `environment: production`.

```bash
REPO="m4rise/doc-classifier-app"

gh variable set GCP_PROJECT_ID    --body "doc-classifier-app"     --repo "$REPO"
gh variable set GCP_REGION        --body "europe-west1"            --repo "$REPO"
gh variable set CLOUD_RUN_SERVICE --body "doc-classifier-backend"  --repo "$REPO"
gh variable set GCS_BUCKET_NAME   --body "doc-classifier-documents" --repo "$REPO"
# ⚠ FIREBASE_PROJECT_ID must be the project ID string, not the project number
gh variable set FIREBASE_PROJECT_ID --body "doc-classifier-app"   --repo "$REPO"
```

### Verify

```bash
gh variable list --repo "$REPO"
# Expected: GCP_PROJECT_ID, GCP_REGION, CLOUD_RUN_SERVICE,
#           GCS_BUCKET_NAME, FIREBASE_PROJECT_ID
```

---

## 4. GCP IAM — CI service account

The `github-actions` SA needs these roles to deploy:

```bash
PROJECT=doc-classifier-app
SA="github-actions@${PROJECT}.iam.gserviceaccount.com"
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT" --format="value(projectNumber)")
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Already done per infra-setup.md — verify:
gcloud projects get-iam-policy "$PROJECT" \
  --flatten="bindings[].members" \
  --filter="bindings.members:${SA}" \
  --format="table(bindings.role)"

# Required roles:
# roles/run.admin
# roles/artifactregistry.writer
# roles/storage.admin
# roles/secretmanager.secretAccessor

# Critical — often missed: SA must be allowed to act as the Cloud Run runtime SA
gcloud iam service-accounts get-iam-policy "$COMPUTE_SA" --project="$PROJECT"
# Must contain: serviceAccount:github-actions@... with roles/iam.serviceAccountUser

# If missing:
gcloud iam service-accounts add-iam-policy-binding "$COMPUTE_SA" \
  --member="serviceAccount:${SA}" \
  --role="roles/iam.serviceAccountUser" \
  --project="$PROJECT"
```

---

## 5. Quick full-verification checklist

Run this to check everything at once:

```bash
PROJECT=doc-classifier-app
REPO="m4rise/doc-classifier-app"

echo "=== GCP Secrets (expect 10) ==="
gcloud secrets list --project="$PROJECT" --format="value(name)" | sort

echo ""
echo "=== GitHub Secrets (expect 6) ==="
gh secret list --repo="$REPO"

echo ""
echo "=== GitHub Variables (expect 5) ==="
gh variable list --repo="$REPO"

echo ""
echo "=== IAM bindings for github-actions SA ==="
gcloud projects get-iam-policy "$PROJECT" \
  --flatten="bindings[].members" \
  --filter="bindings.members:github-actions@${PROJECT}.iam.gserviceaccount.com" \
  --format="table(bindings.role)"
```
