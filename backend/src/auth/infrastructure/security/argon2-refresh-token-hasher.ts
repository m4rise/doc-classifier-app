import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { AppConfiguration } from '../../../config/app.config';
import { RefreshTokenHasher } from '../../application/ports/refresh-token-hasher.port';

@Injectable()
export class Argon2RefreshTokenHasher extends RefreshTokenHasher {
  private readonly options: AppConfiguration['auth']['argon2'];

  constructor(configService: ConfigService<AppConfiguration, true>) {
    super();
    this.options = configService.getOrThrow('auth', { infer: true }).argon2;
  }

  async hash(plainToken: string): Promise<string> {
    return argon2.hash(plainToken, {
      type: argon2.argon2id,
      timeCost: this.options.timeCost,
      memoryCost: this.options.memoryCostKiB,
      parallelism: this.options.parallelism,
    });
  }

  async verify(hash: string, plainToken: string): Promise<boolean> {
    return argon2.verify(hash, plainToken);
  }
}
