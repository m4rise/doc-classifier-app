# ADR-DATA-002: Adoption de Prisma 7 avec driver adapter

## Status

Accepted

## Context

Story 1.3 installe Prisma ORM comme couche d'accès à la base de données PostgreSQL.
Au moment du setup (mai 2026), `npm install prisma @prisma/client` installe
**Prisma 7.x** — la version courante, publiée en mai 2025.

L'équipe a d'abord tenté de rester sur Prisma 6 (downgrade), argument avancé :
_"les docs NestJS officielles ciblent encore Prisma 5/6"_. Cette position a été rejetée :
au bootstrap de l'application, il n'existe aucune dette de migration à gérer,
et rester délibérément sur une version mineure est contraire aux principes de l'équipe
(cf. ADR-INFRA-001 : on choisit la version stable courante, pas le bleeding-edge mais
pas le fossile non plus).

Prisma 7 introduit plusieurs **breaking changes** par rapport à Prisma 6 :

| Breaking change                                                      | Impact                                             |
| -------------------------------------------------------------------- | -------------------------------------------------- |
| `url = env(...)` supprimé du bloc `datasource`                       | → `prisma.config.ts` obligatoire                   |
| `output` obligatoire dans le générateur                              | → client généré hors `node_modules`                |
| Driver adapter requis pour `PrismaClient`                            | → `@prisma/adapter-pg` + `pg`                      |
| Variables d'env non chargées automatiquement par le CLI              | → `import "dotenv/config"` dans `prisma.config.ts` |
| `prisma migrate dev` ne lance plus `prisma generate` automatiquement | → `db:generate` dans les scripts npm               |

## Options considérées

### Option A — Rester sur Prisma 6

Downgrade vers `prisma@^6` / `@prisma/client@^6`.

**Avantages :** zéro breaking change, docs NestJS directement applicables.  
**Inconvénients :** dette dès le jour 1, migration forcée dans 6-12 mois quand Prisma 6
atteindra EOL, pattern adapter non appris immédiatement.  
**Rejeté** : incompatible avec la philosophie du projet (cf. ADR-INFRA-001 sur Node 24).

### Option B — Prisma 7 avec `prisma-client` (nouveau provider)

Utiliser le nouveau générateur `prisma-client` (Rust-free, ESM natif).

**Avantages :** performances améliorées, bundle plus petit, futur du projet.  
**Inconvénients :** NestJS est CJS-first ; passer l'application entière en ESM
(`"type": "module"` dans `package.json`) requiert de changer le runtime de Jest, la CLI
NestJS, le Dockerfile, et toutes les dépendances transitives. Risque élevé au bootstrap.  
**Rejeté** pour l'instant : l'interop CJS/ESM de NestJS est encore expérimentale.
Ce sera le sujet d'un ADR dédié lors du passage ESM-first (probablement Phase 2+).

### Option C — Prisma 7 avec `prisma-client-js` (provider legacy, retenu)

Conserver le générateur `prisma-client-js` (binaire Rust, CJS-compatible).
Adopter les breaking changes obligatoires de Prisma 7 :

- `prisma.config.ts` pour la configuration CLI
- `output` dans le générateur, import depuis le chemin généré
- `@prisma/adapter-pg` + `pg.Pool` pour le runtime

**Avantages :**

- Prisma 7 dès le jour 1 — zéro dette de migration vers l'API courante.
- `prisma-client-js` reste supporté dans Prisma 7 (déprécié mais non supprimé).
- Compatible CJS / NestJS sans refonte du toolchain.
- Aligné avec ADR-INFRA-001 (version stable courante).

**Inconvénients :**

- `prisma-client-js` sera supprimé dans une version future → migration vers
  `prisma-client` (ESM) à planifier.

## Decision

**Option C** — Prisma 7 avec `prisma-client-js`, pattern driver adapter.

## Implémentation

### Configuration CLI (`backend/prisma.config.ts`)

Placé à la racine du `backend/` (là où `package.json` se trouve). Traité par le
runner TypeScript interne de Prisma (non compilé par tsc).

```typescript
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url: env("DATABASE_URL") },
});
```

### Schema (`backend/prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  // url → prisma.config.ts
}
```

### Runtime (`PrismaService`)

```typescript
import { PrismaClient } from "../../../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Pool RF-02 : max 2 connexions (Neon free tier), timeout 10s
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
  connectionTimeoutMillis: 10_000,
});
super({ adapter: new PrismaPg(pool) });
```

### `DATABASE_URL`

Les paramètres Prisma-spécifiques `?connection_limit=2&pool_timeout=10` sont supprimés
de l'URL (ils n'ont jamais été des params PostgreSQL standards — Prisma 6 les interceptait
avant de les transmettre au driver). La configuration du pool est maintenant dans le
code (`pg.Pool` constructor).

### Code généré (`src/generated/`)

Exclu de git (`.gitignore`) et de l'ESLint (`src/generated/**`).
Régénéré via `npm run db:generate` (partie du workflow de setup développeur).

## Consequences

### Positives

- API Prisma 7 maîtrisée dès le début — tous les patterns futurs (Epic 2, 3…)
  seront cohérents.
- Pool configurable explicitement en TypeScript, visible, testable.
- Séparation CLI (prisma.config.ts) / runtime (PrismaService) — responsabilités claires.

### Négatives / Points de vigilance

- `prisma-client-js` est déprécié dans Prisma 7. Plan de migration vers `prisma-client`
  (ESM) à prévoir dans un ADR dédié (Phase 2 ou 3).
- `src/generated/` doit être régénéré après `git clone` et après chaque `git pull`
  qui modifie `schema.prisma`. À documenter dans le README du backend.
- La vulnérabilité `@hono/node-server` (moderate) dans `@prisma/dev` est interne à
  Prisma Studio — non exposée en production. Surveillée via `npm audit`.

## Références

- [Prisma 7 migration guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)
- [Driver adapters](https://www.prisma.io/docs/orm/overview/databases/database-drivers)
- [Prisma Config reference](https://www.prisma.io/docs/orm/reference/prisma-config-reference)
- ADR-DATA-001 — Stratégie de migrations (nullable-first)
- ADR-INFRA-001 — Runtime Node 24 (philosophie "version stable courante")
