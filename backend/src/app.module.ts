import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import {
  AppConfiguration,
  loadAppConfig,
  validateEnvironment,
} from './config/app.config';
import { DocumentsModule } from './documents/documents.module';
import { HealthModule } from './health/health.module';
import { ObservabilityModule } from './infrastructure/observability/observability.module';
import { PrismaModule } from './shared/infrastructure/database/prisma.module';
import { createThrottlerModuleOptions } from './shared/infrastructure/rate-limiting/throttle.config';
import { RequestIdInterceptor } from './shared/interceptors/request-id.interceptor';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadAppConfig],
      validate: validateEnvironment,
    }),
    // PrismaModule is @Global() — registers PrismaService + PrismaHealthIndicator
    // in the DI container once; all feature modules access them without re-importing.
    PrismaModule,
    ObservabilityModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfiguration, true>) => {
        const rateLimit = configService.getOrThrow('rateLimit', {
          infer: true,
        });
        return createThrottlerModuleOptions(rateLimit);
      },
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfiguration, true>) => {
        const app = configService.getOrThrow('app', { infer: true });
        const isProduction = app.nodeEnv === 'production';

        return {
          pinoHttp: {
            genReqId: () => crypto.randomUUID(),
            level: isProduction ? 'info' : 'debug',
            transport: isProduction
              ? undefined
              : { target: 'pino-pretty', options: { singleLine: true } },
            redact: ['req.headers.authorization', 'req.headers["x-mcp-key"]'],
          },
        };
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
