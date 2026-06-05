export class InvalidEmailError extends Error {
  constructor() {
    super('Invalid email address');
  }
}

export class Email {
  private constructor(public readonly value: string) {}

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new InvalidEmailError();
    }

    return new Email(normalized);
  }
}
