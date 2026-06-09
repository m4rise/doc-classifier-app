import { Injectable } from '@nestjs/common';
import { Role } from '../../../generated/prisma';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import {
  CreateRefreshTokenInput,
  RefreshTokenRepository,
} from '../../application/ports/refresh-token.repository.port';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import { UserRole } from '../../domain/entities/user.entity';

function toDomainRole(role: Role): UserRole {
  const map: Record<Role, UserRole> = { USER: 'USER', ADMIN: 'ADMIN' };
  return map[role];
}

@Injectable()
export class PrismaRefreshTokenRepository extends RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByJti(jti: string): Promise<RefreshToken | null> {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { jti },
      select: {
        id: true,
        jti: true,
        tokenHash: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
        user: {
          select: {
            email: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    if (!refreshToken || !refreshToken.user.isActive) {
      return null;
    }

    return new RefreshToken(
      refreshToken.id,
      refreshToken.jti,
      refreshToken.tokenHash,
      refreshToken.userId,
      refreshToken.user.email,
      toDomainRole(refreshToken.user.role),
      refreshToken.expiresAt,
      refreshToken.revokedAt,
    );
  }

  async create(input: CreateRefreshTokenInput): Promise<RefreshToken> {
    const refreshToken = await this.prisma.refreshToken.create({
      data: {
        jti: input.jti,
        tokenHash: input.tokenHash,
        userId: input.user.userId,
        expiresAt: input.expiresAt,
      },
      select: {
        id: true,
        jti: true,
        tokenHash: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
        user: {
          select: {
            email: true,
            role: true,
          },
        },
      },
    });

    return new RefreshToken(
      refreshToken.id,
      refreshToken.jti,
      refreshToken.tokenHash,
      refreshToken.userId,
      refreshToken.user.email,
      toDomainRole(refreshToken.user.role),
      refreshToken.expiresAt,
      refreshToken.revokedAt,
    );
  }

  async revoke(id: string, revokedAt: Date): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt },
    });
  }

  async revokeAllForUser(userId: string, revokedAt: Date): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt },
    });
  }
}
