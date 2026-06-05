export class Email {
  private constructor(public readonly value: string) {}

  static create(raw: string): Email {
    return new Email(raw.trim().toLowerCase());
  }
}
