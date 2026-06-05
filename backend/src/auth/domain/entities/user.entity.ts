import { Email } from '../value-objects/email.vo';

export type UserRole = 'USER' | 'ADMIN';

export class User {
  constructor(
    readonly id: string,
    readonly email: Email,
    readonly role: UserRole,
    readonly isActive = true,
  ) {}
}
