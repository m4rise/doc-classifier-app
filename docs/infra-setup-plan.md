# Prioritized Infra Setup Plan

## 1. GCP — Secure CI/CD

- Create the CI/CD service account: `github-actions@doc-classifier-app.iam.gserviceaccount.com`
- Configure Workload Identity Federation (OIDC) for GitHub Actions (no static keys; use explicit IAM policies)

## 2. Neon.tech

- Générer la connection string Neon (avec les bons paramètres)
- Vérifier/ajouter `connection_limit=2` et `pool_timeout=10` dans l’URL

## 3. Firebase

- Initialiser Firebase Hosting sur chaque projet (SPA rewrite vers `/index.html`)
- Générer le service account JSON pour CI

## 4. Sentry

- Créer le projet Sentry `doc-classifier-app-backend`
- Récupérer le DSN et le stocker dans GCP Secret Manager + GitHub Secrets

## 5. Grafana Cloud

- Create the Grafana Cloud stack `doc-classifier-app`
- Configure Prometheus remote write and Tempo OTLP endpoint
- Create an Access Policy with explicit scopes (metrics:write, traces:write, logs:write)
- Generate an API key for this policy
- Store credentials in GCP Secret Manager and GitHub Actions secrets

## 6. Google AI Studio

- Générer la Gemini API key
- Stocker la clé dans GCP Secret Manager + GitHub Secrets
- Vérifier les quotas free tier

## 7. Secrets & Validation

- Provision all secrets and environment variables listed in `backend/.env.example` in GCP Secret Manager and GitHub Actions
- Ensure `backend/.env.example` matches the list of required secrets and variables
- Never commit any secret values
