import {
  EmailAlreadyInUseError,
  TosConsentRequiredError,
} from './register.errors';
import { RegisterUseCase } from './register.use-case';
import { PasswordHasher } from '../domain/password-hasher';
import {
  CreateUserWithConsentInput,
  UserRepository,
} from '../domain/user.repository';
import { User } from '../domain/user.entity';

class UserRepositoryMock extends UserRepository {
  existingUser: User | null = null;
  createdUser: User = { id: 'user-1', email: 'john@example.com', role: 'USER' };
  lastCreateInput: CreateUserWithConsentInput | null = null;

  findByEmail(email: string): Promise<User | null> {
    if (!this.existingUser) {
      return Promise.resolve(null);
    }

    return Promise.resolve(
      this.existingUser.email === email ? this.existingUser : null,
    );
  }

  createWithConsent(input: CreateUserWithConsentInput): Promise<User> {
    this.lastCreateInput = input;
    return Promise.resolve(this.createdUser);
  }
}

class PasswordHasherMock extends PasswordHasher {
  hashedValue = 'hashed-password';
  hashCalls: string[] = [];

  hash(plainPassword: string): Promise<string> {
    this.hashCalls.push(plainPassword);
    return Promise.resolve(this.hashedValue);
  }
}

describe('RegisterUseCase', () => {
  it('registers a user and creates a consent record when payload is valid', async () => {
    const repository = new UserRepositoryMock();
    const hasher = new PasswordHasherMock();
    const useCase = new RegisterUseCase(repository, hasher, '1.0');

    const result = await useCase.execute({
      email: 'john@example.com',
      password: 'super-secure-password',
      tosAccepted: true,
      tosVersion: '1.0',
      ipAddress: '127.0.0.1',
    });

    expect(result).toEqual(repository.createdUser);
    expect(hasher.hashCalls).toEqual(['super-secure-password']);
    expect(repository.lastCreateInput).toMatchObject({
      email: 'john@example.com',
      passwordHash: hasher.hashedValue,
      tosVersion: '1.0',
      ipAddress: '127.0.0.1',
    });
    expect(repository.lastCreateInput?.acceptedAt).toBeInstanceOf(Date);
  });

  it('throws EmailAlreadyInUseError when email is already registered', async () => {
    const repository = new UserRepositoryMock();
    repository.existingUser = {
      id: 'existing-user',
      email: 'john@example.com',
      role: 'USER',
    };
    const hasher = new PasswordHasherMock();
    const useCase = new RegisterUseCase(repository, hasher, '1.0');

    await expect(
      useCase.execute({
        email: 'john@example.com',
        password: 'super-secure-password',
        tosAccepted: true,
        tosVersion: '1.0',
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyInUseError);
    expect(repository.lastCreateInput).toBeNull();
    expect(hasher.hashCalls).toHaveLength(0);
  });

  it('throws TosConsentRequiredError when tosAccepted is false', async () => {
    const repository = new UserRepositoryMock();
    const hasher = new PasswordHasherMock();
    const useCase = new RegisterUseCase(repository, hasher, '1.0');

    await expect(
      useCase.execute({
        email: 'john@example.com',
        password: 'super-secure-password',
        tosAccepted: false,
        tosVersion: '1.0',
      }),
    ).rejects.toBeInstanceOf(TosConsentRequiredError);
    expect(repository.lastCreateInput).toBeNull();
    expect(hasher.hashCalls).toHaveLength(0);
  });
});
