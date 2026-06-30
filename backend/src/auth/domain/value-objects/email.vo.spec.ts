import { Email, InvalidEmailError } from './email.vo';

describe('Email', () => {
  it('trims and lowercases the address', () => {
    expect(Email.create('  John.Doe@Example.COM  ').value).toBe(
      'john.doe@example.com',
    );
  });

  it.each(['not-an-email', 'john @example.com', 'john@example'])(
    'rejects %s with the existing domain error',
    (raw) => {
      let error: unknown;

      try {
        Email.create(raw);
      } catch (caught) {
        error = caught;
      }

      expect(error).toBeInstanceOf(InvalidEmailError);
      expect(error).toEqual(
        expect.objectContaining({ message: 'Invalid email address' }),
      );
    },
  );
});
