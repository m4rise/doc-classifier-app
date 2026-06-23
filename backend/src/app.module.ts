import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DocumentsModule } from './documents/documents.module';
import { HealthModule } from './health/health.module';
import { ObservabilityModule } from './infrastructure/observability/observability.module';
import { PrismaModule } from './shared/infrastructure/database/prisma.module';
import { createThrottlerModuleOptions } from './shared/infrastructure/rate-limiting/throttle.config';
import { RequestIdInterceptor } from './shared/interceptors/request-id.interceptor';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // PrismaModule is @Global() — registers PrismaService + PrismaHealthIndicator
    // in the DI container once; all feature modules access them without re-importing.
    PrismaModule,
    ObservabilityModule,
    ThrottlerModule.forRoot(createThrottlerModuleOptions()),
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: () => crypto.randomUUID(),
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        redact: ['req.headers.authorization', 'req.headers["x-mcp-key"]'],
      },
    }),
    AuthModule,
    DocumentsModule,
    UsersModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestIdInterceptor },
  ],
})
export class AppModule {}
