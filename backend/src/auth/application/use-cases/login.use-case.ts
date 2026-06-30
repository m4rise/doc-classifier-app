import { AuthenticatedUser } from '../authenticated-user';
import { PasswordHasher } from '../ports/password-hasher.port';
import { UserRepository } from '../ports/user.repository.port';
import { InvalidCredentialsError } from '../../domain/errors/login.errors';
import { Email } from '../../domain/value-objects/email.vo';

interface LoginInput {
  email: string;
  password: string;
}

export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: LoginInput): Promise<AuthenticatedUser> {
    const email = Email.create(input.email);
    const credentials = await this.userRepository.findCredentialsByEmail(email);

    if (!credentials || !credentials.user.isActive) {
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await this.passwordHasher.verify(
      credentials.passwordHash,
      input.password,
    );

    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    return {
      userId: credentials.user.id,
      email: credentials.user.email.value,
      role: credentials.user.role,
    };
  }
}
