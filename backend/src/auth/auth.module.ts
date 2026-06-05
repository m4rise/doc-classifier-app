import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import {
  CURRENT_TOS_VERSION,
  JWT_ACCESS_EXPIRES_IN_SECONDS,
  PASSWORD_HASHER,
  USER_REPOSITORY,
} from './application/auth.tokens';
import { PasswordHasher } from './application/ports/password-hasher.port';
import { UserRepository } from './application/ports/user.repository.port';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { JwtAuthGuard } from './infrastructure/passport/jwt-auth.guard';
import { JwtStrategy } from './infrastructure/passport/jwt.strategy';
import { LocalAuthGuard } from './infrastructure/passport/local-auth.guard';
import { LocalStrategy } from './infrastructure/passport/local.strategy';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import { Argon2PasswordHasher } from './infrastructure/security/argon2-password-hasher';
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
    Argon2PasswordHasher,
    LocalStrategy,
    JwtStrategy,
    LocalAuthGuard,
    JwtAuthGuard,
    { provide: USER_REPOSITORY, useExisting: PrismaUserRepository },
    { provide: PASSWORD_HASHER, useExisting: Argon2PasswordHasher },
    {
      provide: CURRENT_TOS_VERSION,
      useValue: process.env.TOS_VERSION ?? '1.0',
    },
    {
      provide: JWT_ACCESS_EXPIRES_IN_SECONDS,
      useValue: 900,
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
  ],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
