import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { ObservabilityModule } from './infrastructure/observability/observability.module';
import { RequestIdInterceptor } from './shared/interceptors/request-id.interceptor';

@Module({
  imports: [
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
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: RequestIdInterceptor },
  ],
})
export class AppModule {}
