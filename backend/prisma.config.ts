// Prisma 7 CLI configuration — processed by Prisma's internal TypeScript runner.
// This file is NOT compiled by tsc and is NOT part of the NestJS application bundle.
// It configures how the Prisma CLI (migrate dev, migrate deploy, generate…) connects
// to the database.
//
// Why here and not in schema.prisma?
//   Prisma 7 removed `url = env(...)` from datasource blocks. All database connection
//   settings are centralised in this file (ADR-DATA-002).
//
// Why `import "dotenv/config"` ?
//   Prisma 7 no longer auto-loads .env files. The CLI must be explicitly told to load
//   environment variables before accessing them.
//   See: https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7#environment-variables
//
// Docs: https://www.prisma.io/docs/orm/reference/prisma-config-reference

import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // RF-02: ?connection_limit and ?pool_timeout are Prisma 6 params no longer valid
    // in pg.Pool connection strings. Pool settings are now configured in PrismaService
    // via pg.Pool constructor (max: 2, connectionTimeoutMillis: 10_000).
    // DATABASE_URL must be a clean PostgreSQL connection string (no Prisma-specific params).
    url: env('DATABASE_URL'),
  },
});
