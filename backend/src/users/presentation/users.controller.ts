import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Patch,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../auth/presentation/authenticated-request';
import { JwtAuthGuard } from '../../auth/infrastructure/passport/jwt-auth.guard';
import { GetProfileUseCase } from '../application/use-cases/get-profile.use-case';
import { UpdateProfileUseCase } from '../application/use-cases/update-profile.use-case';
import {
  UserProfileEmailAlreadyInUseError,
  UserProfileNotFoundError,
} from '../domain/errors/user-profile.errors';
import { InvalidProfileEmailError } from '../domain/value-objects/profile-email.vo';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';

@Controller('api/v1/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly getProfileUseCase: GetProfileUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
  ) {}

  @Get('me')
  async getMe(
    @Req() req: AuthenticatedRequest,
  ): Promise<UserProfileResponseDto> {
    try {
      return await this.getProfileUseCase.execute(req.user.userId);
    } catch (error) {
      if (error instanceof UserProfileNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }

  @Patch('me')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateMe(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfileResponseDto> {
    try {
      return await this.updateProfileUseCase.execute({
        userId: req.user.userId,
        email: dto.email,
      });
    } catch (error) {
      if (error instanceof UserProfileEmailAlreadyInUseError) {
        throw new ConflictException(error.message);
      }

      if (error instanceof UserProfileNotFoundError) {
        throw new NotFoundException(error.message);
      }

      if (error instanceof InvalidProfileEmailError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }
}
