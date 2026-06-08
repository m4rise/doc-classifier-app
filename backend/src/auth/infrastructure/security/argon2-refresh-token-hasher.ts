import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { RefreshTokenHasher } from '../../application/ports/refresh-token-hasher.port';

@Injectable()
export class Argon2RefreshTokenHasher extends RefreshTokenHasher {
  async hash(plainToken: string): Promise<string> {
    return argon2.hash(plainToken, {
      type: argon2.argon2id,
      timeCost: 3,
      memoryCost: 19456,
      parallelism: 1,
    });
  }

  async verify(hash: string, plainToken: string): Promise<boolean> {
    return argon2.verify(hash, plainToken);
  }
}
