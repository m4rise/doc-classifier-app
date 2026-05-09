# doc-classifier-app

Monorepo fullstack pour classification intelligente de documents.

## Stack

- Backend: NestJS (TypeScript strict)
- Frontend: Vue 3 + Vite + Pinia + Router
- Database: PostgreSQL (local via Docker, staging/prod via Neon)
- Storage: Google Cloud Storage
- Hosting frontend: Firebase Hosting
- Runtime: Node 24

## Prerequisites

- Node.js 24 (`mise install`)
- Docker + Docker Compose
- npm

## Before You Start

Run the infrastructure bootstrap checklist in `docs/infra-setup.md`.

## Local Setup

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

## Notes

- Architecture target and decisions are tracked in `docs/adr/`.
- `.mcp.json` must be generated per environment and never hardcoded with a single URL.
