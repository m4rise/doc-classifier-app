
# doc-classifier-app

<!-- Badges -->
![CI](https://github.com/m4rise/doc-classifier-app/actions/workflows/ci.yml/badge.svg)
![Deploy](https://github.com/m4rise/doc-classifier-app/actions/workflows/deploy.yml/badge.svg)
[![codecov](https://codecov.io/gh/m4rise/doc-classifier-app/graph/badge.svg)](https://codecov.io/gh/m4rise/doc-classifier-app)
![Dependencies](https://img.shields.io/librariesio/github/m4rise/doc-classifier-app)
![License](https://img.shields.io/github/license/m4rise/doc-classifier-app)
![Release](https://img.shields.io/github/v/release/m4rise/doc-classifier-app)
![Conventional Commits](https://img.shields.io/badge/commits-conventional-brightgreen)
![Open Issues](https://img.shields.io/github/issues/m4rise/doc-classifier-app)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)

---

## 🚦 Quality & Automation

- CI/CD with GitHub Actions (lint, test, build, security, deploy)
- Renovate for dependency management
- Husky + lint-staged + Commitlint (quality before commit/push)
- Branch and commit conventions (Conventional Commits)
- Issue and PR templates
- Structured documentation (CONTRIBUTING, ADR, etc.)
- Ready for SonarCloud, automated changelog, dynamic badges

---

Fullstack monorepo for intelligent document classification.

## Stack

- **Backend:** NestJS (strict TypeScript)
- **Frontend:** Vue 3 + Vite + Pinia + Router
- **Database:** PostgreSQL (local via Docker, staging/prod via Neon)
- **Storage:** Google Cloud Storage
- **Frontend hosting:** Firebase Hosting
- **Runtime:** Node 24

## Prerequisites

- Node.js 24 (`mise install`)
- Docker + Docker Compose
- npm

## Quickstart

1. Install Node 24 via mise:
	```bash
	mise install
	node -v
	```
2. Install dependencies:
	```bash
	npm --prefix backend install
	npm --prefix frontend install
	```
3. Start PostgreSQL + API hot reload:
	```bash
	docker compose up -d
	```
4. Start frontend:
	```bash
	npm --prefix frontend run dev
	```

## Monorepo Scripts

```bash
npm run dev:backend
npm run dev:frontend
npm run lint
npm run test
npm run build
```

## How to contribute

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines, branch naming, and PR process.

## Notes

- Architecture targets and decisions are tracked in `docs/adr/`.
- Authentication and refresh behavior are documented in `docs/AUTH_FLOW.md`.
- `.mcp.json` must be generated per environment and never hardcoded with a single URL.
