import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthenticatedUser } from '../../application/authenticated-user';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { InvalidCredentialsError } from '../../domain/errors/login.errors';
import { InvalidEmailError } from '../../domain/value-objects/email.vo';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly loginUseCase: LoginUseCase) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<AuthenticatedUser> {
    try {
      return await this.loginUseCase.execute({ email, password });
    } catch (error) {
      if (
        error instanceof InvalidCredentialsError ||
        error instanceof InvalidEmailError
      ) {
        throw new UnauthorizedException('Invalid credentials');
      }

      throw error;
    }
  }
}
