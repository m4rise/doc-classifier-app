import { UserRole } from '../../domain/entities/user.entity';

export class AuthenticatedUserResponseDto {
  userId!: string;
  email!: string;
  role!: UserRole;
}
