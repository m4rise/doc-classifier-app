import { InvalidProfileEmailError, ProfileEmail } from './profile-email.vo';

describe('ProfileEmail', () => {
  it('trims and lowercases the address', () => {
    expect(ProfileEmail.create('  John.Doe@Example.COM  ').value).toBe(
      'john.doe@example.com',
    );
  });

  it.each(['not-an-email', 'john @example.com', 'john@example'])(
    'rejects %s with the existing domain error',
    (raw) => {
      let error: unknown;

      try {
        ProfileEmail.create(raw);
      } catch (caught) {
        error = caught;
      }

      expect(error).toBeInstanceOf(InvalidProfileEmailError);
      expect(error).toEqual(
        expect.objectContaining({ message: 'Invalid email address' }),
      );
    },
  );
});
