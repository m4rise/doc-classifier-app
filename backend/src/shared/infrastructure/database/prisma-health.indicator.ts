import { Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';

import { PrismaService } from './prisma.service';

/**
 * Custom health indicator for the PostgreSQL connection via Prisma.
 *
 * Why `$queryRaw\`SELECT 1\`` ?
 *   - Lightest possible query: validates TCP connection + SQL parsing in one round-trip.
 *   - Does not touch any user table → always works, even on an empty schema.
 *
 * Why extend `HealthIndicator` (not implement a raw function)?
 *   - `HealthIndicator` provides `getStatus(key, isHealthy, data?)` — the standard
 *     shape consumed by @nestjs/terminus HealthCheck. Keeps output schema consistent
 *     with other built-in indicators (HTTP, memory, disk…).
 *
 * Docs: https://docs.nestjs.com/microservices/health-checks#creating-a-health-indicator
 */
@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'Database health check failed',
        this.getStatus(key, false, {
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }
}
