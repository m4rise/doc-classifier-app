import { UserProfile } from '../../domain/entities/user-profile.entity';
import { UserProfileRepository } from '../ports/user-profile.repository.port';

export class ListUsersUseCase {
  constructor(private readonly userProfileRepository: UserProfileRepository) {}

  async execute(): Promise<UserProfile[]> {
    return this.userProfileRepository.findAll();
  }
}
