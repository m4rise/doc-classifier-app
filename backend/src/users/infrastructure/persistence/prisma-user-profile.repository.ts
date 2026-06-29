import { Injectable } from '@nestjs/common';
import { Role } from '../../../generated/prisma';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { isPrismaUniqueConstraintViolation } from '../../../shared/infrastructure/prisma/prisma-errors';
import {
  UpdateUserProfileInput,
  UserProfileRepository,
} from '../../application/ports/user-profile.repository.port';
import {
  UserProfile,
  UserProfileRole,
} from '../../domain/entities/user-profile.entity';
import { UserProfileEmailAlreadyInUseError } from '../../domain/errors/user-profile.errors';

function toDomainRole(role: Role): UserProfileRole {
  const map: Record<Role, UserProfileRole> = { USER: 'USER', ADMIN: 'ADMIN' };
  return map[role];
}

function toDomainProfile(user: {
  id: string;
  email: string;
  role: Role;
  createdAt: Date;
}): UserProfile {
  return new UserProfile(
    user.id,
    user.email,
    toDomainRole(user.role),
    user.createdAt,
  );
}

@Injectable()
export class PrismaUserProfileRepository extends UserProfileRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findAll(): Promise<UserProfile[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    return users.map(toDomainProfile);
  }

  async findById(userId: string): Promise<UserProfile | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    return user ? toDomainProfile(user) : null;
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    return user ? toDomainProfile(user) : null;
  }

  async update(
    userId: string,
    input: UpdateUserProfileInput,
  ): Promise<UserProfile> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: input,
        select: { id: true, email: true, role: true, createdAt: true },
      });

      return toDomainProfile(user);
    } catch (error) {
      if (isPrismaUniqueConstraintViolation(error)) {
        throw new UserProfileEmailAlreadyInUseError();
      }

      throw error;
    }
  }
}
