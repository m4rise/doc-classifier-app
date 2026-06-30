import { User } from '../../domain/entities/user.entity';
import {
  EmailAlreadyInUseError,
  TosConsentRequiredError,
  UnsupportedTosVersionError,
} from '../../domain/errors/register.errors';
import { PasswordPolicy } from '../../domain/services/password-policy';
import { Email } from '../../domain/value-objects/email.vo';
import { PasswordHasher } from '../ports/password-hasher.port';
import { UserRepository } from '../ports/user.repository.port';

interface RegisterInput {
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

    const email = Email.create(input.email);
    PasswordPolicy.assertRegisterable(input.password);
    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      throw new EmailAlreadyInUseError();
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    return this.userRepository.createWithConsent({
      email,
      passwordHash,
      tosVersion: input.tosVersion,
      acceptedAt: new Date(),
      ipAddress: input.ipAddress,
    });
  }
}
