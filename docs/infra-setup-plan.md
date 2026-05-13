# Plan d’action priorisé — Setup Infra

## 1. GCP — CI/CD sécurisé

- Créer le service account CI/CD : `github-actions@doc-classifier-app.iam.gserviceaccount.com`
- Configurer Workload Identity Federation (OIDC) pour GitHub Actions

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

- Créer le stack Grafana Cloud `doc-classifier-app`
- Configurer Prometheus remote write + Tempo OTLP
- Stocker les credentials dans GCP Secret Manager

## 6. Google AI Studio

- Générer la Gemini API key
- Stocker la clé dans GCP Secret Manager + GitHub Secrets
- Vérifier les quotas free tier

## 7. Secrets & Validation

- Provisionner tous les secrets listés dans le runbook dans GCP Secret Manager et GitHub Actions
- Vérifier que `backend/.env.example` correspond bien à la liste des secrets
- Vérifier qu’aucune valeur de secret n’est committée
