import { Injectable } from '@nestjs/common';
import { Role } from '../../../generated/prisma';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import {
  CreateUserWithConsentInput,
  UserRepository,
} from '../../application/ports/user.repository.port';
import { User, UserRole } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.vo';

function toDomainRole(role: Role): UserRole {
  const map: Record<Role, UserRole> = { USER: 'USER', ADMIN: 'ADMIN' };
  return map[role];
}

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByEmail(email: Email): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.value },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return null;
    }

    return new User(user.id, Email.create(user.email), toDomainRole(user.role));
  }

  async createWithConsent(input: CreateUserWithConsentInput): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        email: input.email.value,
        passwordHash: input.passwordHash,
        role: Role.USER,
        consentRecords: {
          create: {
            tosVersion: input.tosVersion,
            acceptedAt: input.acceptedAt,
            ipAddress: input.ipAddress,
          },
        },
      },
      select: { id: true, email: true, role: true },
    });

    return new User(user.id, Email.create(user.email), toDomainRole(user.role));
  }
}
