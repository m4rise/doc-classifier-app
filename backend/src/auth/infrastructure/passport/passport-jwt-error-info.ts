export interface PassportJwtTokenExpiredError {
  name: 'TokenExpiredError';
}

export function isPassportJwtTokenExpiredError(
  info: unknown,
): info is PassportJwtTokenExpiredError {
  return (
    typeof info === 'object' &&
    info !== null &&
    'name' in info &&
    info.name === 'TokenExpiredError'
  );
}
