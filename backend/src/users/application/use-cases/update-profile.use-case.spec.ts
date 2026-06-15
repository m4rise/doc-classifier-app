import { UserProfile } from '../../domain/entities/user-profile.entity';
import {
  UserProfileEmailAlreadyInUseError,
  UserProfileNotFoundError,
} from '../../domain/errors/user-profile.errors';
import {
  UpdateUserProfileInput,
  UserProfileRepository,
} from '../ports/user-profile.repository.port';
import { UpdateProfileUseCase } from './update-profile.use-case';

class UserProfileRepositoryMock extends UserProfileRepository {
  profiles = new Map<string, UserProfile>();
  lastUpdate: { userId: string; input: UpdateUserProfileInput } | null = null;

  findAll(): Promise<UserProfile[]> {
    return Promise.resolve([...this.profiles.values()]);
  }

  findById(userId: string): Promise<UserProfile | null> {
    return Promise.resolve(this.profiles.get(userId) ?? null);
  }

  findByEmail(email: string): Promise<UserProfile | null> {
    return Promise.resolve(
      [...this.profiles.values()].find((profile) => profile.email === email) ??
        null,
    );
  }

  update(userId: string, input: UpdateUserProfileInput): Promise<UserProfile> {
    this.lastUpdate = { userId, input };
    const currentProfile = this.profiles.get(userId);

    if (!currentProfile) {
      throw new Error('Profile missing in mock');
    }

    const updatedProfile = new UserProfile(
      currentProfile.id,
      input.email ?? currentProfile.email,
      currentProfile.role,
      currentProfile.createdAt,
    );
    this.profiles.set(userId, updatedProfile);

    return Promise.resolve(updatedProfile);
  }
}

describe('UpdateProfileUseCase', () => {
  it('updates the authenticated user email after normalizing it', async () => {
    const repository = new UserProfileRepositoryMock();
    repository.profiles.set(
      'user-1',
      new UserProfile(
        'user-1',
        'old@example.com',
        'USER',
        new Date('2026-01-01T00:00:00.000Z'),
      ),
    );
    const useCase = new UpdateProfileUseCase(repository);

    const result = await useCase.execute({
      userId: 'user-1',
      email: ' New@Example.COM ',
    });

    expect(result.email).toBe('new@example.com');
    expect(repository.lastUpdate).toEqual({
      userId: 'user-1',
      input: { email: 'new@example.com' },
    });
  });

  it('throws when the authenticated profile does not exist', async () => {
    const repository = new UserProfileRepositoryMock();
    const useCase = new UpdateProfileUseCase(repository);

    await expect(
      useCase.execute({ userId: 'missing-user', email: 'new@example.com' }),
    ).rejects.toBeInstanceOf(UserProfileNotFoundError);
    expect(repository.lastUpdate).toBeNull();
  });

  it('throws when the requested email belongs to another user', async () => {
    const repository = new UserProfileRepositoryMock();
    repository.profiles.set(
      'user-1',
      new UserProfile(
        'user-1',
        'old@example.com',
        'USER',
        new Date('2026-01-01T00:00:00.000Z'),
      ),
    );
    repository.profiles.set(
      'user-2',
      new UserProfile(
        'user-2',
        'taken@example.com',
        'USER',
        new Date('2026-01-02T00:00:00.000Z'),
      ),
    );
    const useCase = new UpdateProfileUseCase(repository);

    await expect(
      useCase.execute({ userId: 'user-1', email: 'taken@example.com' }),
    ).rejects.toBeInstanceOf(UserProfileEmailAlreadyInUseError);
    expect(repository.lastUpdate).toBeNull();
  });
});
