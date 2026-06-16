import { UserProfile } from '../../domain/entities/user-profile.entity';

export interface UpdateUserProfileInput {
  email?: string;
}

export abstract class UserProfileRepository {
  abstract findAll(): Promise<UserProfile[]>;
  abstract findById(userId: string): Promise<UserProfile | null>;
  abstract findByEmail(email: string): Promise<UserProfile | null>;
  abstract update(
    userId: string,
    input: UpdateUserProfileInput,
  ): Promise<UserProfile>;
}
