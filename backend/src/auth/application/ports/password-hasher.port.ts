export abstract class PasswordHasher {
  abstract hash(plainPassword: string): Promise<string>;
}
