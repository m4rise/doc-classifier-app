import { UserRole } from '../../domain/entities/user.entity';

export class RegisterResponseDto {
  id!: string;
  email!: string;
  role!: UserRole;
}
