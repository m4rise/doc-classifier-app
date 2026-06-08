export class RefreshTokenInvalidError extends Error {
  constructor() {
    super('Invalid refresh token');
  }
}

export class RefreshTokenExpiredError extends Error {
  constructor() {
    super('Refresh token expired');
  }
}

export class RefreshTokenReusedError extends Error {
  constructor() {
    super('Refresh token reuse detected');
  }
}
