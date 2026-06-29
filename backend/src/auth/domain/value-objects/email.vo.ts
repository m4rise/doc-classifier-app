import { normalizeAndValidateEmailAddress } from '../../../shared/domain/email-address';

export class InvalidEmailError extends Error {
  constructor() {
    super('Invalid email address');
  }
}

export class Email {
  private constructor(public readonly value: string) {}

  static create(raw: string): Email {
    const normalized = normalizeAndValidateEmailAddress(raw);

    if (normalized === null) {
      throw new InvalidEmailError();
    }

    return new Email(normalized);
  }
}
