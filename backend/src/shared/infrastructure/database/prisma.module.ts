import { Global, Module } from '@nestjs/common';

import { PrismaHealthIndicator } from './prisma-health.indicator';
import { PrismaService } from './prisma.service';

/**
 * Global database module — registered once in AppModule, available everywhere.
 *
 * Why @Global()?
 *   PrismaService is cross-cutting infrastructure: every vertical slice's
 *   repository implementation depends on it. Making the module global means
 *   feature modules receive PrismaService via DI without importing PrismaModule
 *   themselves. There is only one PrismaClient instance for the process lifetime.
 *
 * Why export PrismaHealthIndicator?
 *   HealthModule needs it without creating a circular import. Exporting it here
 *   keeps all database-layer providers co-located.
 *
 * Docs: https://docs.nestjs.com/modules#global-modules
 */
@Global()
@Module({
  providers: [PrismaService, PrismaHealthIndicator],
  exports: [PrismaService, PrismaHealthIndicator],
})
export class PrismaModule {}
