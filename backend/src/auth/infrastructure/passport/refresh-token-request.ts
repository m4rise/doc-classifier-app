import { JwtRefreshTokenPayload } from '../../application/jwt-refresh-token-payload';

export interface RefreshTokenRequestUser {
  refreshToken: string;
  payload: JwtRefreshTokenPayload;
}

export interface RefreshTokenRequest {
  user: RefreshTokenRequestUser;
}
