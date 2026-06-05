import { PasswordHasher } from '../domain/password-hasher';
import { User } from '../domain/user.entity';
import { UserRepository } from '../domain/user.repository';
import {
  EmailAlreadyInUseError,
  TosConsentRequiredError,
  UnsupportedTosVersionError,
} from './register.errors';

export interface RegisterInput {
  email: string;
  password: string;
  tosAccepted: boolean;
  tosVersion: string;
  ipAddress?: string;
}

export class RegisterUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly currentTosVersion: string,
  ) {}

  async execute(input: RegisterInput): Promise<User> {
    if (!input.tosAccepted) {
      throw new TosConsentRequiredError();
    }

    if (input.tosVersion !== this.currentTosVersion) {
      throw new UnsupportedTosVersionError();
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    const existingUser = await this.userRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new EmailAlreadyInUseError();
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    return this.userRepository.createWithConsent({
      email: normalizedEmail,
      passwordHash,
      tosVersion: input.tosVersion,
      acceptedAt: new Date(),
      ipAddress: input.ipAddress,
    });
  }
}
