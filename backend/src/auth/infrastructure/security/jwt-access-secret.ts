export function resolveJwtAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'test') {
    return 'test-only-jwt-access-secret';
  }

  throw new Error('JWT_ACCESS_SECRET is required');
}
