export function resolveJwtRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'test') {
    return 'test-only-jwt-refresh-secret';
  }

  throw new Error('JWT_REFRESH_SECRET is required');
}
