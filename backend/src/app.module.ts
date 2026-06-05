import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { ObservabilityModule } from './infrastructure/observability/observability.module';
import { PrismaModule } from './shared/infrastructure/database/prisma.module';
import { RequestIdInterceptor } from './shared/interceptors/request-id.interceptor';

@Module({
  imports: [
    // PrismaModule is @Global() — registers PrismaService + PrismaHealthIndicator
    // in the DI container once; all feature modules access them without re-importing.
    PrismaModule,
    ObservabilityModule,
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
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: RequestIdInterceptor },
  ],
})
export class AppModule {}
