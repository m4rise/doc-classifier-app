export abstract class PasswordHasher {
  abstract hash(plainPassword: string): Promise<string>;
}

export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
