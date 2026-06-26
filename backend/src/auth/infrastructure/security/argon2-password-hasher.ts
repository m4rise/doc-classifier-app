import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { AppConfiguration } from '../../../config/app.config';
import { PasswordHasher } from '../../application/ports/password-hasher.port';

@Injectable()
export class Argon2PasswordHasher extends PasswordHasher {
  private readonly options: AppConfiguration['auth']['argon2'];

  constructor(configService: ConfigService<AppConfiguration, true>) {
    super();
    this.options = configService.getOrThrow('auth', { infer: true }).argon2;
  }

  async hash(plainPassword: string): Promise<string> {
    return argon2.hash(plainPassword, {
      type: argon2.argon2id,
      timeCost: this.options.timeCost,
      memoryCost: this.options.memoryCostKiB,
      parallelism: this.options.parallelism,
    });
  }

  async verify(hash: string, plainPassword: string): Promise<boolean> {
    return argon2.verify(hash, plainPassword);
  }
}
