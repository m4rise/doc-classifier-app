import { User } from './user.entity';

export interface CreateUserWithConsentInput {
  email: string;
  passwordHash: string;
  tosVersion: string;
  acceptedAt: Date;
  ipAddress?: string;
}

export abstract class UserRepository {
  abstract findByEmail(email: string): Promise<User | null>;
  abstract createWithConsent(input: CreateUserWithConsentInput): Promise<User>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
