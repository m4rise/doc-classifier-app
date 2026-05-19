import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Prisma 7: PrismaClient is generated at custom output path (no longer in @prisma/client).
// Path is relative to this file: shared/infrastructure/database/ → ../../.. → src/generated/prisma
// See: https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7#schema-changes
import { PrismaClient } from '../../../generated/prisma';

/**
 * Thin wrapper around PrismaClient that hooks into the NestJS module lifecycle.
 *
 * Prisma 7 changes vs Prisma 6:
 *   - PrismaClient requires a driver adapter (@prisma/adapter-pg for PostgreSQL).
 *   - Connection pool is configured via pg.Pool constructor (RF-02), not via
 *     URL query params (?connection_limit / ?pool_timeout) which are no longer valid.
 *   - DATABASE_URL must be a clean connection string (no Prisma-specific params).
 *   - Import is from the generated output path, not @prisma/client.
 *
 * Why pg.Pool and not a bare connection string?
 *   pg.Pool lets us set max connections and timeout explicitly in code (RF-02),
 *   making pool configuration visible, typed, and testable.
 *
 * Refs:
 *   https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7#driver-adapters
 *   https://docs.nestjs.com/recipes/prisma
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // RF-02: Neon.tech free tier max 10 connections — cap at 2 per pod replica.
      max: 2,
      // RF-02: Fail fast if no connection available within 10 seconds.
      connectionTimeoutMillis: 10_000,
    });
    super({ adapter: new PrismaPg(pool) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }
}
