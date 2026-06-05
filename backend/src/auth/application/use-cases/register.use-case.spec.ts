import { User } from '../../domain/entities/user.entity';
import {
  EmailAlreadyInUseError,
  TosConsentRequiredError,
  UnsupportedTosVersionError,
  WeakPasswordError,
} from '../../domain/errors/register.errors';
import { Email, InvalidEmailError } from '../../domain/value-objects/email.vo';
import { PasswordHasher } from '../ports/password-hasher.port';
import {
  CreateUserWithConsentInput,
  UserCredentials,
  UserRepository,
} from '../ports/user.repository.port';
import { RegisterUseCase } from './register.use-case';

class UserRepositoryMock extends UserRepository {
  existingUser: User | null = null;
  createdUser: User = new User(
    'user-1',
    Email.create('john@example.com'),
    'USER',
  );
  lastCreateInput: CreateUserWithConsentInput | null = null;

  findByEmail(email: Email): Promise<User | null> {
    if (!this.existingUser) {
      return Promise.resolve(null);
    }

    return Promise.resolve(
      this.existingUser.email.value === email.value ? this.existingUser : null,
    );
  }

  findCredentialsByEmail(): Promise<UserCredentials | null> {
    return Promise.resolve(null);
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

  verify(): Promise<boolean> {
    return Promise.resolve(false);
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
    expect(repository.lastCreateInput?.email.value).toBe('john@example.com');
    expect(repository.lastCreateInput?.passwordHash).toBe(hasher.hashedValue);
    expect(repository.lastCreateInput?.tosVersion).toBe('1.0');
    expect(repository.lastCreateInput?.ipAddress).toBe('127.0.0.1');
    expect(repository.lastCreateInput?.acceptedAt).toBeInstanceOf(Date);
  });

  it('throws EmailAlreadyInUseError when email is already registered', async () => {
    const repository = new UserRepositoryMock();
    repository.existingUser = new User(
      'existing-user',
      Email.create('john@example.com'),
      'USER',
    );
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

  it('throws UnsupportedTosVersionError when tosVersion does not match current version', async () => {
    const repository = new UserRepositoryMock();
    const hasher = new PasswordHasherMock();
    const useCase = new RegisterUseCase(repository, hasher, '1.0');

    await expect(
      useCase.execute({
        email: 'john@example.com',
        password: 'super-secure-password',
        tosAccepted: true,
        tosVersion: '0.9',
      }),
    ).rejects.toBeInstanceOf(UnsupportedTosVersionError);
    expect(repository.lastCreateInput).toBeNull();
    expect(hasher.hashCalls).toHaveLength(0);
  });

  it('throws InvalidEmailError before hashing when email is invalid', async () => {
    const repository = new UserRepositoryMock();
    const hasher = new PasswordHasherMock();
    const useCase = new RegisterUseCase(repository, hasher, '1.0');

    await expect(
      useCase.execute({
        email: 'not-an-email',
        password: 'super-secure-password',
        tosAccepted: true,
        tosVersion: '1.0',
      }),
    ).rejects.toBeInstanceOf(InvalidEmailError);
    expect(repository.lastCreateInput).toBeNull();
    expect(hasher.hashCalls).toHaveLength(0);
  });

  it('throws WeakPasswordError before hashing when password is too short', async () => {
    const repository = new UserRepositoryMock();
    const hasher = new PasswordHasherMock();
    const useCase = new RegisterUseCase(repository, hasher, '1.0');

    await expect(
      useCase.execute({
        email: 'john@example.com',
        password: 'short',
        tosAccepted: true,
        tosVersion: '1.0',
      }),
    ).rejects.toBeInstanceOf(WeakPasswordError);
    expect(repository.lastCreateInput).toBeNull();
    expect(hasher.hashCalls).toHaveLength(0);
  });
});
