import { normalizeAndValidateEmailAddress } from './email-address';

describe('normalizeAndValidateEmailAddress', () => {
  it('returns a trimmed lowercase email when valid', () => {
    expect(normalizeAndValidateEmailAddress('  John.Doe@Example.COM  ')).toBe(
      'john.doe@example.com',
    );
  });

  it.each(['not-an-email', 'john @example.com', 'john@example'])(
    'returns null for %s',
    (raw) => {
      expect(normalizeAndValidateEmailAddress(raw)).toBeNull();
    },
  );
});
