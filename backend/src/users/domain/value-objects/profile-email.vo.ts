export class InvalidProfileEmailError extends Error {
  constructor() {
    super('Invalid email address');
  }
}

export class ProfileEmail {
  private constructor(public readonly value: string) {}

  static create(raw: string): ProfileEmail {
    const normalized = raw.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new InvalidProfileEmailError();
    }

    return new ProfileEmail(normalized);
  }
}
