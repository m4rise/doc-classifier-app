import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '../../../generated/prisma';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import {
  CreateUserWithConsentInput,
  UserRepository,
  UserCredentials,
} from '../../application/ports/user.repository.port';
import { User, UserRole } from '../../domain/entities/user.entity';
import { EmailAlreadyInUseError } from '../../domain/errors/register.errors';
import { Email } from '../../domain/value-objects/email.vo';

function toDomainRole(role: Role): UserRole {
  const map: Record<Role, UserRole> = { USER: 'USER', ADMIN: 'ADMIN' };
  return map[role];
}

function isUniqueEmailConstraintViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByEmail(email: Email): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.value },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user) {
      return null;
    }

    return new User(
      user.id,
      Email.create(user.email),
      toDomainRole(user.role),
      user.isActive,
    );
  }

  async findCredentialsByEmail(email: Email): Promise<UserCredentials | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.value },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      user: new User(
        user.id,
        Email.create(user.email),
        toDomainRole(user.role),
        user.isActive,
      ),
      passwordHash: user.passwordHash,
    };
  }

  async createWithConsent(input: CreateUserWithConsentInput): Promise<User> {
    try {
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

      return new User(
        user.id,
        Email.create(user.email),
        toDomainRole(user.role),
        true,
      );
    } catch (error) {
      if (isUniqueEmailConstraintViolation(error)) {
        throw new EmailAlreadyInUseError();
      }

      throw error;
    }
  }
}
