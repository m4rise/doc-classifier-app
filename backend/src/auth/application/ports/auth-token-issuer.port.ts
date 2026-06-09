import { AuthenticatedUser } from '../authenticated-user';

export abstract class AuthTokenIssuer {
  abstract issueAccessToken(user: AuthenticatedUser): string;
  abstract issueRefreshToken(user: AuthenticatedUser, jti: string): string;
}
