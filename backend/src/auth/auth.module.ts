import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { randomUUID } from 'crypto';
import {
  AUTH_TOKEN_ISSUER,
  CURRENT_TOS_VERSION,
  JWT_ACCESS_EXPIRES_IN_SECONDS,
  JWT_REFRESH_EXPIRES_IN_SECONDS,
  PASSWORD_HASHER,
  REFRESH_TOKEN_HASHER,
  REFRESH_TOKEN_REPOSITORY,
  USER_REPOSITORY,
} from './application/auth.tokens';
import { AuthTokenIssuer } from './application/ports/auth-token-issuer.port';
import { PasswordHasher } from './application/ports/password-hasher.port';
import { RefreshTokenHasher } from './application/ports/refresh-token-hasher.port';
import { RefreshTokenRepository } from './application/ports/refresh-token.repository.port';
import { IssueAuthTokensUseCase } from './application/use-cases/issue-auth-tokens.use-case';
import { UserRepository } from './application/ports/user.repository.port';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { JwtAuthGuard } from './infrastructure/passport/jwt-auth.guard';
import { JwtStrategy } from './infrastructure/passport/jwt.strategy';
import { LocalAuthGuard } from './infrastructure/passport/local-auth.guard';
import { LocalStrategy } from './infrastructure/passport/local.strategy';
import { RefreshTokenGuard } from './infrastructure/passport/refresh-token.guard';
import { RefreshTokenStrategy } from './infrastructure/passport/refresh-token.strategy';
import { PrismaRefreshTokenRepository } from './infrastructure/persistence/prisma-refresh-token.repository';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import { Argon2PasswordHasher } from './infrastructure/security/argon2-password-hasher';
import { Argon2RefreshTokenHasher } from './infrastructure/security/argon2-refresh-token-hasher';
import { JwtAuthTokenIssuer } from './infrastructure/security/jwt-auth-token-issuer';
import { resolveJwtAccessSecret } from './infrastructure/security/jwt-access-secret';
import { AuthController } from './presentation/auth.controller';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: resolveJwtAccessSecret(),
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    PrismaUserRepository,
    PrismaRefreshTokenRepository,
    Argon2PasswordHasher,
    Argon2RefreshTokenHasher,
    JwtAuthTokenIssuer,
    LocalStrategy,
    JwtStrategy,
    RefreshTokenStrategy,
    LocalAuthGuard,
    JwtAuthGuard,
    RefreshTokenGuard,
    { provide: USER_REPOSITORY, useExisting: PrismaUserRepository },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useExisting: PrismaRefreshTokenRepository,
    },
    { provide: PASSWORD_HASHER, useExisting: Argon2PasswordHasher },
    { provide: REFRESH_TOKEN_HASHER, useExisting: Argon2RefreshTokenHasher },
    { provide: AUTH_TOKEN_ISSUER, useExisting: JwtAuthTokenIssuer },
    {
      provide: CURRENT_TOS_VERSION,
      useValue: process.env.TOS_VERSION ?? '1.0',
    },
    {
      provide: JWT_ACCESS_EXPIRES_IN_SECONDS,
      useValue: 900,
    },
    {
      provide: JWT_REFRESH_EXPIRES_IN_SECONDS,
      useValue: 7 * 24 * 60 * 60,
    },
    {
      provide: RegisterUseCase,
      useFactory: (
        userRepository: UserRepository,
        passwordHasher: PasswordHasher,
        currentTosVersion: string,
      ) =>
        new RegisterUseCase(userRepository, passwordHasher, currentTosVersion),
      inject: [USER_REPOSITORY, PASSWORD_HASHER, CURRENT_TOS_VERSION],
    },
    {
      provide: LoginUseCase,
      useFactory: (
        userRepository: UserRepository,
        passwordHasher: PasswordHasher,
      ) => new LoginUseCase(userRepository, passwordHasher),
      inject: [USER_REPOSITORY, PASSWORD_HASHER],
    },
    {
      provide: IssueAuthTokensUseCase,
      useFactory: (
        refreshTokenRepository: RefreshTokenRepository,
        refreshTokenHasher: RefreshTokenHasher,
        authTokenIssuer: AuthTokenIssuer,
        jwtAccessExpiresInSeconds: number,
        jwtRefreshExpiresInSeconds: number,
      ) =>
        new IssueAuthTokensUseCase(
          refreshTokenRepository,
          refreshTokenHasher,
          authTokenIssuer,
          () => new Date(),
          randomUUID,
          jwtAccessExpiresInSeconds,
          jwtRefreshExpiresInSeconds,
        ),
      inject: [
        REFRESH_TOKEN_REPOSITORY,
        REFRESH_TOKEN_HASHER,
        AUTH_TOKEN_ISSUER,
        JWT_ACCESS_EXPIRES_IN_SECONDS,
        JWT_REFRESH_EXPIRES_IN_SECONDS,
      ],
    },
    {
      provide: RefreshTokenUseCase,
      useFactory: (
        refreshTokenRepository: RefreshTokenRepository,
        refreshTokenHasher: RefreshTokenHasher,
        authTokenIssuer: AuthTokenIssuer,
        jwtAccessExpiresInSeconds: number,
        jwtRefreshExpiresInSeconds: number,
      ) =>
        new RefreshTokenUseCase(
          refreshTokenRepository,
          refreshTokenHasher,
          authTokenIssuer,
          () => new Date(),
          randomUUID,
          jwtAccessExpiresInSeconds,
          jwtRefreshExpiresInSeconds,
        ),
      inject: [
        REFRESH_TOKEN_REPOSITORY,
        REFRESH_TOKEN_HASHER,
        AUTH_TOKEN_ISSUER,
        JWT_ACCESS_EXPIRES_IN_SECONDS,
        JWT_REFRESH_EXPIRES_IN_SECONDS,
      ],
    },
  ],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
