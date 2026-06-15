import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import {
  createLoginThrottleOptions,
  createRegisterThrottleOptions,
} from '../../shared/infrastructure/rate-limiting/throttle.config';
import { IssueAuthTokensUseCase } from '../application/use-cases/issue-auth-tokens.use-case';
import { LogoutUseCase } from '../application/use-cases/logout.use-case';
import { RefreshTokenUseCase } from '../application/use-cases/refresh-token.use-case';
import { RegisterUseCase } from '../application/use-cases/register.use-case';
import {
  RefreshTokenExpiredError,
  RefreshTokenInvalidError,
  RefreshTokenReusedError,
} from '../domain/errors/refresh-token.errors';
import {
  EmailAlreadyInUseError,
  TosConsentRequiredError,
  UnsupportedTosVersionError,
  WeakPasswordError,
} from '../domain/errors/register.errors';
import { InvalidEmailError } from '../domain/value-objects/email.vo';
import { JwtAuthGuard } from '../infrastructure/passport/jwt-auth.guard';
import { LocalAuthGuard } from '../infrastructure/passport/local-auth.guard';
import { RefreshTokenGuard } from '../infrastructure/passport/refresh-token.guard';
import type { RefreshTokenRequest } from '../infrastructure/passport/refresh-token-request';
import type { AuthenticatedRequest } from './authenticated-request';
import { AuthenticatedUserResponseDto } from './dto/authenticated-user-response.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RefreshTokenResponseDto } from './dto/refresh-token-response.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly issueAuthTokensUseCase: IssueAuthTokensUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Post('register')
  @Throttle(createRegisterThrottleOptions())
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
  @Throttle(createLoginThrottleOptions())
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  async login(@Req() req: AuthenticatedRequest): Promise<LoginResponseDto> {
    return this.issueAuthTokensUseCase.execute(req.user);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: AuthenticatedRequest): Promise<void> {
    await this.logoutUseCase.execute({ userId: req.user.userId });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshTokenGuard)
  async refresh(
    @Req() req: RefreshTokenRequest,
  ): Promise<RefreshTokenResponseDto> {
    try {
      return await this.refreshTokenUseCase.execute({
        refreshToken: req.user.refreshToken,
        payload: req.user.payload,
      });
    } catch (error) {
      if (error instanceof RefreshTokenExpiredError) {
        throw new UnauthorizedException(error.message);
      }

      if (
        error instanceof RefreshTokenInvalidError ||
        error instanceof RefreshTokenReusedError
      ) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      throw error;
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: AuthenticatedRequest): AuthenticatedUserResponseDto {
    return req.user;
  }
}
