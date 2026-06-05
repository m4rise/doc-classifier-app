import { UserRole } from '../domain/entities/user.entity';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
}
