import { UserProfile } from '../../domain/entities/user-profile.entity';
import { UserProfileNotFoundError } from '../../domain/errors/user-profile.errors';
import { UserProfileRepository } from '../ports/user-profile.repository.port';

export class GetProfileUseCase {
  constructor(private readonly userProfileRepository: UserProfileRepository) {}

  async execute(userId: string): Promise<UserProfile> {
    const profile = await this.userProfileRepository.findById(userId);

    if (!profile) {
      throw new UserProfileNotFoundError();
    }

    return profile;
  }
}
