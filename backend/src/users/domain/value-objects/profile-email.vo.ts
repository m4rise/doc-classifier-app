import { normalizeAndValidateEmailAddress } from '../../../shared/domain/email-address';

export class InvalidProfileEmailError extends Error {
  constructor() {
    super('Invalid email address');
  }
}

export class ProfileEmail {
  private constructor(public readonly value: string) {}

  static create(raw: string): ProfileEmail {
    const normalized = normalizeAndValidateEmailAddress(raw);

    if (normalized === null) {
      throw new InvalidProfileEmailError();
    }

    return new ProfileEmail(normalized);
  }
}
