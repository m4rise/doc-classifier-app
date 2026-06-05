import { WeakPasswordError } from '../errors/register.errors';

export class PasswordPolicy {
  static assertRegisterable(password: string): void {
    if (password.length < 8) {
      throw new WeakPasswordError();
    }
  }
}
