export interface RegisterResponseBody {
  id: string;
  email: string;
  role: string;
}

export interface LoginResponseBody {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export type RefreshTokenResponseBody = LoginResponseBody;

export interface HttpResponseBody {
  body: unknown;
}

export function asErrorMessageBody(value: unknown): { message?: unknown } {
  if (typeof value === 'object' && value !== null) {
    return value;
  }

  return {};
}
