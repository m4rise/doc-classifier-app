import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { JWT_ACCESS_EXPIRES_IN_SECONDS } from '../application/auth.tokens';
import type { JwtAccessTokenPayload } from '../application/jwt-access-token-payload';
import { RegisterUseCase } from '../application/use-cases/register.use-case';
import {
  EmailAlreadyInUseError,
  TosConsentRequiredError,
  UnsupportedTosVersionError,
  WeakPasswordError,
} from '../domain/errors/register.errors';
import { InvalidEmailError } from '../domain/value-objects/email.vo';
import { JwtAuthGuard } from '../infrastructure/passport/jwt-auth.guard';
import { LocalAuthGuard } from '../infrastructure/passport/local-auth.guard';
import type { AuthenticatedRequest } from './authenticated-request';
import { AuthenticatedUserResponseDto } from './dto/authenticated-user-response.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly jwtService: JwtService,
    @Inject(JWT_ACCESS_EXPIRES_IN_SECONDS)
    private readonly jwtAccessExpiresInSeconds: number,
  ) {}

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

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  login(@Req() req: AuthenticatedRequest): LoginResponseDto {
    const payload: JwtAccessTokenPayload = {
      sub: req.user.userId,
      email: req.user.email,
      role: req.user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      expiresIn: this.jwtAccessExpiresInSeconds,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: AuthenticatedRequest): AuthenticatedUserResponseDto {
    return req.user;
  }
}
