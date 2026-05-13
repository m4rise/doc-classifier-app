import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';

/**
 * ObservabilityModule — cross-cutting infrastructure concern.
 * Wires Sentry error reporting at the NestJS level.
 * instrument.ts (Sentry.init) is loaded before this, in main.ts.
 */
@Module({
  imports: [SentryModule.forRoot()],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class ObservabilityModule {}
