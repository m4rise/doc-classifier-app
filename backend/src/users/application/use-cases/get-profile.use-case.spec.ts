import { UserProfile } from '../../domain/entities/user-profile.entity';
import { UserProfileNotFoundError } from '../../domain/errors/user-profile.errors';
import { UserProfileRepository } from '../ports/user-profile.repository.port';
import { GetProfileUseCase } from './get-profile.use-case';

class UserProfileRepositoryMock extends UserProfileRepository {
  profile: UserProfile | null = null;

  findAll(): Promise<UserProfile[]> {
    return Promise.resolve([]);
  }

  findById(): Promise<UserProfile | null> {
    return Promise.resolve(this.profile);
  }

  findByEmail(): Promise<UserProfile | null> {
    return Promise.resolve(null);
  }

  update(): Promise<UserProfile> {
    throw new Error('Not implemented');
  }
}

describe('GetProfileUseCase', () => {
  it('returns the profile for the authenticated user id', async () => {
    const repository = new UserProfileRepositoryMock();
    repository.profile = new UserProfile(
      'user-1',
      'john@example.com',
      'USER',
      new Date('2026-01-01T00:00:00.000Z'),
    );
    const useCase = new GetProfileUseCase(repository);

    await expect(useCase.execute('user-1')).resolves.toEqual(
      repository.profile,
    );
  });

  it('throws when the profile does not exist', async () => {
    const repository = new UserProfileRepositoryMock();
    const useCase = new GetProfileUseCase(repository);

    await expect(useCase.execute('missing-user')).rejects.toBeInstanceOf(
      UserProfileNotFoundError,
    );
  });
});
