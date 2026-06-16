import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { USER_PROFILE_REPOSITORY } from './application/users.tokens';
import { UserProfileRepository } from './application/ports/user-profile.repository.port';
import { GetProfileUseCase } from './application/use-cases/get-profile.use-case';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { UpdateProfileUseCase } from './application/use-cases/update-profile.use-case';
import { PrismaUserProfileRepository } from './infrastructure/persistence/prisma-user-profile.repository';
import { UsersController } from './presentation/users.controller';

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [
    PrismaUserProfileRepository,
    {
      provide: USER_PROFILE_REPOSITORY,
      useExisting: PrismaUserProfileRepository,
    },
    {
      provide: GetProfileUseCase,
      useFactory: (userProfileRepository: UserProfileRepository) =>
        new GetProfileUseCase(userProfileRepository),
      inject: [USER_PROFILE_REPOSITORY],
    },
    {
      provide: ListUsersUseCase,
      useFactory: (userProfileRepository: UserProfileRepository) =>
        new ListUsersUseCase(userProfileRepository),
      inject: [USER_PROFILE_REPOSITORY],
    },
    {
      provide: UpdateProfileUseCase,
      useFactory: (userProfileRepository: UserProfileRepository) =>
        new UpdateProfileUseCase(userProfileRepository),
      inject: [USER_PROFILE_REPOSITORY],
    },
  ],
})
export class UsersModule {}
