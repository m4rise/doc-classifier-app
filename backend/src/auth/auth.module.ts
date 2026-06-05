import { Module } from '@nestjs/common';
import { CURRENT_TOS_VERSION } from './application/auth.tokens';
import { RegisterUseCase } from './application/register.use-case';
import { PASSWORD_HASHER } from './domain/password-hasher';
import { USER_REPOSITORY } from './domain/user.repository';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import { Argon2PasswordHasher } from './infrastructure/security/argon2-password-hasher';
import { AuthController } from './presentation/auth.controller';

@Module({
  controllers: [AuthController],
  providers: [
    PrismaUserRepository,
    Argon2PasswordHasher,
    { provide: USER_REPOSITORY, useExisting: PrismaUserRepository },
    { provide: PASSWORD_HASHER, useExisting: Argon2PasswordHasher },
    {
      provide: CURRENT_TOS_VERSION,
      useValue: process.env.TOS_VERSION ?? '1.0',
    },
    {
      provide: RegisterUseCase,
      useFactory: (
        userRepository: PrismaUserRepository,
        passwordHasher: Argon2PasswordHasher,
        currentTosVersion: string,
      ) =>
        new RegisterUseCase(userRepository, passwordHasher, currentTosVersion),
      inject: [USER_REPOSITORY, PASSWORD_HASHER, CURRENT_TOS_VERSION],
    },
  ],
})
export class AuthModule {}
