import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PasswordHasher } from '../../application/ports/password-hasher.port';

@Injectable()
export class Argon2PasswordHasher extends PasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    return argon2.hash(plainPassword, {
      type: argon2.argon2id,
      timeCost: 3,
      memoryCost: 19456,
      parallelism: 1,
    });
  }

  async verify(hash: string, plainPassword: string): Promise<boolean> {
    return argon2.verify(hash, plainPassword);
  }
}
