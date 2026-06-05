import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.vo';

export interface CreateUserWithConsentInput {
  email: Email;
  passwordHash: string;
  tosVersion: string;
  acceptedAt: Date;
  ipAddress?: string;
}

export abstract class UserRepository {
  abstract findByEmail(email: Email): Promise<User | null>;
  abstract createWithConsent(input: CreateUserWithConsentInput): Promise<User>;
}
