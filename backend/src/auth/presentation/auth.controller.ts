import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { RegisterUseCase } from '../application/use-cases/register.use-case';
import {
  EmailAlreadyInUseError,
  TosConsentRequiredError,
  UnsupportedTosVersionError,
  WeakPasswordError,
} from '../domain/errors/register.errors';
import { InvalidEmailError } from '../domain/value-objects/email.vo';
import { RegisterResponseDto } from './dto/register-response.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly registerUseCase: RegisterUseCase) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
  ): Promise<RegisterResponseDto> {
    try {
      const user = await this.registerUseCase.execute({
        email: dto.email,
        password: dto.password,
        tosAccepted: dto.tosAccepted,
        tosVersion: dto.tosVersion,
        ipAddress: req.ip,
      });
      return { id: user.id, email: user.email.value, role: user.role };
    } catch (error) {
      if (error instanceof EmailAlreadyInUseError) {
        throw new ConflictException(error.message);
      }

      if (error instanceof TosConsentRequiredError) {
        throw new BadRequestException(error.message);
      }

      if (error instanceof UnsupportedTosVersionError) {
        throw new BadRequestException(error.message);
      }

      if (error instanceof InvalidEmailError) {
        throw new BadRequestException(error.message);
      }

      if (error instanceof WeakPasswordError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }
}
