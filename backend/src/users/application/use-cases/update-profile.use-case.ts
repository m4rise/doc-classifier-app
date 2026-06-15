import { UserProfile } from '../../domain/entities/user-profile.entity';
import {
  UserProfileEmailAlreadyInUseError,
  UserProfileNotFoundError,
} from '../../domain/errors/user-profile.errors';
import {
  InvalidProfileEmailError,
  ProfileEmail,
} from '../../domain/value-objects/profile-email.vo';
import { UserProfileRepository } from '../ports/user-profile.repository.port';

export interface UpdateProfileInput {
  userId: string;
  email?: string;
}

export class UpdateProfileUseCase {
  constructor(private readonly userProfileRepository: UserProfileRepository) {}

  async execute(input: UpdateProfileInput): Promise<UserProfile> {
    const currentProfile = await this.userProfileRepository.findById(
      input.userId,
    );

    if (!currentProfile) {
      throw new UserProfileNotFoundError();
    }

    if (!input.email) {
      return currentProfile;
    }

    let normalizedEmail: string;
    try {
      normalizedEmail = ProfileEmail.create(input.email).value;
    } catch (error) {
      if (error instanceof InvalidProfileEmailError) {
        throw error;
      }

      throw error;
    }

    const existingProfile =
      await this.userProfileRepository.findByEmail(normalizedEmail);

    if (existingProfile && existingProfile.id !== input.userId) {
      throw new UserProfileEmailAlreadyInUseError();
    }

    return this.userProfileRepository.update(input.userId, {
      email: normalizedEmail,
    });
  }
}
