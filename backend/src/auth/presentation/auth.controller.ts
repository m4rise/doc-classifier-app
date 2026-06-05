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
import { Request } from 'express';
import {
  EmailAlreadyInUseError,
  TosConsentRequiredError,
  UnsupportedTosVersionError,
} from '../application/register.errors';
import { RegisterUseCase } from '../application/register.use-case';
import { RegisterDto } from './dto/register.dto';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly registerUseCase: RegisterUseCase) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    try {
      return await this.registerUseCase.execute({
        email: dto.email,
        password: dto.password,
        tosAccepted: dto.tosAccepted,
        tosVersion: dto.tosVersion,
        ipAddress: req.ip,
      });
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

      throw error;
    }
  }
}
