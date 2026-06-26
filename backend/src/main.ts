import './instrument'; // must be first - OTel patches modules before they are loaded
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AppConfiguration } from './config/app.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const configService =
    app.get<ConfigService<AppConfiguration, true>>(ConfigService);
  const appConfig = configService.getOrThrow('app', { infer: true });

  app.set('trust proxy', 1);
  app.useLogger(app.get(Logger));
  await app.listen(appConfig.port);
}
void bootstrap();
