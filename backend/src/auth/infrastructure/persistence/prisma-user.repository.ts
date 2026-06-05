import { Injectable } from '@nestjs/common';
import { Role } from '../../../generated/prisma';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import {
  CreateUserWithConsentInput,
  UserRepository,
} from '../../domain/user.repository';
import { User } from '../../domain/user.entity';

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  async createWithConsent(input: CreateUserWithConsentInput): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
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

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
