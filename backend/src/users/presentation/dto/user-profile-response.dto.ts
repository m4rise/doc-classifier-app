import { UserProfileRole } from '../../domain/entities/user-profile.entity';

export class UserProfileResponseDto {
  id!: string;
  email!: string;
  role!: UserProfileRole;
  createdAt!: Date;
}
