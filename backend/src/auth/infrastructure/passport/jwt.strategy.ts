import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfiguration } from '../../../config/app.config';
import { AuthenticatedUser } from '../../application/authenticated-user';
import { USER_REPOSITORY } from '../../application/auth.tokens';
import { JwtAccessTokenPayload } from '../../application/jwt-access-token-payload';
import { UserRepository } from '../../application/ports/user.repository.port';
import { getJwtAccessSecret } from '../security/jwt-config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    configService: ConfigService<AppConfiguration, true>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: getJwtAccessSecret(configService),
    });
  }

  async validate(payload: JwtAccessTokenPayload): Promise<AuthenticatedUser> {
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      throw new UnauthorizedException();
    }

    const user = await this.userRepository.findById(payload.sub);

    if (!user?.isActive) {
      throw new UnauthorizedException();
    }

    return {
      userId: user.id,
      email: user.email.value,
      role: user.role,
    };
  }
}
