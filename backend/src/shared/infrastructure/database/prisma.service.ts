import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { AppConfiguration } from '../../../config/app.config';

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
 *   pg.Pool lets us set max connections and timeout explicitly through typed
 *   application config (RF-02), making pool policy visible and testable without
 *   Prisma-specific URL parameters.
 *
 * Refs:
 *   https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7#driver-adapters
 *   https://docs.nestjs.com/recipes/prisma
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;

  constructor(configService: ConfigService<AppConfiguration, true>) {
    const database = configService.getOrThrow('database', { infer: true });
    const pool = new Pool({
      connectionString: database.url,
      // RF-02: default caps each pod replica at 2 connections on Neon free tier.
      max: database.pool.max,
      // RF-02: fail fast if no connection becomes available within the timeout.
      connectionTimeoutMillis: database.pool.connectionTimeoutMs,
    });
    super({ adapter: new PrismaPg(pool) });
    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
  }
}
