import { isPassportJwtTokenExpiredError } from './passport-jwt-error-info';

describe('isPassportJwtTokenExpiredError', () => {
  it('recognizes Passport JWT expiration information', () => {
    const info: unknown = { name: 'TokenExpiredError' };

    expect(isPassportJwtTokenExpiredError(info)).toBe(true);
  });

  it.each([null, 'TokenExpiredError', {}, { name: 'JsonWebTokenError' }])(
    'rejects %p',
    (info) => {
      expect(isPassportJwtTokenExpiredError(info)).toBe(false);
    },
  );
});
