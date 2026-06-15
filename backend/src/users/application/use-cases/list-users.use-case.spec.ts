import { UserProfile } from '../../domain/entities/user-profile.entity';
import { UserProfileRepository } from '../ports/user-profile.repository.port';
import { ListUsersUseCase } from './list-users.use-case';

class UserProfileRepositoryMock extends UserProfileRepository {
  profiles: UserProfile[] = [];

  findAll(): Promise<UserProfile[]> {
    return Promise.resolve(this.profiles);
  }

  findById(): Promise<UserProfile | null> {
    return Promise.resolve(null);
  }

  findByEmail(): Promise<UserProfile | null> {
    return Promise.resolve(null);
  }

  update(): Promise<UserProfile> {
    throw new Error('Not implemented');
  }
}

describe('ListUsersUseCase', () => {
  it('returns all user profiles from the repository', async () => {
    const repository = new UserProfileRepositoryMock();
    repository.profiles = [
      new UserProfile(
        'user-1',
        'john@example.com',
        'USER',
        new Date('2026-01-01T00:00:00.000Z'),
      ),
      new UserProfile(
        'admin-1',
        'admin@example.com',
        'ADMIN',
        new Date('2026-01-02T00:00:00.000Z'),
      ),
    ];
    const useCase = new ListUsersUseCase(repository);

    await expect(useCase.execute()).resolves.toEqual(repository.profiles);
  });
});
