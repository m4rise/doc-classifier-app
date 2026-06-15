import { AuthenticatedUser } from '../authenticated-user';
import { PasswordHasher } from '../ports/password-hasher.port';
import { UserCredentials, UserRepository } from '../ports/user.repository.port';
import { User } from '../../domain/entities/user.entity';
import { InvalidCredentialsError } from '../../domain/errors/login.errors';
import { Email } from '../../domain/value-objects/email.vo';
import { LoginUseCase } from './login.use-case';

class UserRepositoryMock extends UserRepository {
  credentials: UserCredentials | null = {
    user: new User('user-1', Email.create('john@example.com'), 'USER', true),
    passwordHash: 'argon2id-hash',
  };

  findById(): Promise<User | null> {
    return Promise.resolve(null);
  }

  findByEmail(): Promise<User | null> {
    return Promise.resolve(null);
  }

  findCredentialsByEmail(email: Email): Promise<UserCredentials | null> {
    if (this.credentials?.user.email.value !== email.value) {
      return Promise.resolve(null);
    }

    return Promise.resolve(this.credentials);
  }

  createWithConsent(): Promise<User> {
    throw new Error('Not used in login tests');
  }
}

class PasswordHasherMock extends PasswordHasher {
  verifyResult = true;
  verifyCalls: Array<{ hash: string; password: string }> = [];

  hash(): Promise<string> {
    throw new Error('Not used in login tests');
  }

  verify(hash: string, plainPassword: string): Promise<boolean> {
    this.verifyCalls.push({ hash, password: plainPassword });
    return Promise.resolve(this.verifyResult);
  }
}

describe('LoginUseCase', () => {
  it('returns an authenticated user when credentials are valid', async () => {
    const repository = new UserRepositoryMock();
    const hasher = new PasswordHasherMock();
    const useCase = new LoginUseCase(repository, hasher);

    const result = await useCase.execute({
      email: 'John@Example.com',
      password: 'super-secure-password',
    });

    const expected: AuthenticatedUser = {
      userId: 'user-1',
      email: 'john@example.com',
      role: 'USER',
    };
    expect(result).toEqual(expected);
    expect(hasher.verifyCalls).toEqual([
      { hash: 'argon2id-hash', password: 'super-secure-password' },
    ]);
  });

  it('throws InvalidCredentialsError when password is wrong', async () => {
    const repository = new UserRepositoryMock();
    const hasher = new PasswordHasherMock();
    hasher.verifyResult = false;
    const useCase = new LoginUseCase(repository, hasher);

    await expect(
      useCase.execute({
        email: 'john@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('throws InvalidCredentialsError when user is inactive', async () => {
    const repository = new UserRepositoryMock();
    repository.credentials = {
      user: new User('user-1', Email.create('john@example.com'), 'USER', false),
      passwordHash: 'argon2id-hash',
    };
    const hasher = new PasswordHasherMock();
    const useCase = new LoginUseCase(repository, hasher);

    await expect(
      useCase.execute({
        email: 'john@example.com',
        password: 'super-secure-password',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(hasher.verifyCalls).toHaveLength(0);
  });

  it('throws InvalidCredentialsError when email is unknown', async () => {
    const repository = new UserRepositoryMock();
    const hasher = new PasswordHasherMock();
    const useCase = new LoginUseCase(repository, hasher);

    await expect(
      useCase.execute({
        email: 'missing@example.com',
        password: 'super-secure-password',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(hasher.verifyCalls).toHaveLength(0);
  });
});
