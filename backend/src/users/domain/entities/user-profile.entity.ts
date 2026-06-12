export type UserProfileRole = 'USER' | 'ADMIN';

export class UserProfile {
  constructor(
    readonly id: string,
    readonly email: string,
    readonly role: UserProfileRole,
    readonly createdAt: Date,
  ) {}
}
