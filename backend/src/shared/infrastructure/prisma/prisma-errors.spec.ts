import { Prisma } from '../../../generated/prisma';
import { isPrismaUniqueConstraintViolation } from './prisma-errors';

describe('isPrismaUniqueConstraintViolation', () => {
  it('recognizes Prisma P2002 errors', () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: 'test' },
    );

    expect(isPrismaUniqueConstraintViolation(error)).toBe(true);
  });

  it('rejects other Prisma known errors and lookalike values', () => {
    const otherPrismaError = new Prisma.PrismaClientKnownRequestError(
      'Record not found',
      { code: 'P2025', clientVersion: 'test' },
    );

    expect(isPrismaUniqueConstraintViolation(otherPrismaError)).toBe(false);
    expect(isPrismaUniqueConstraintViolation({ code: 'P2002' })).toBe(false);
    expect(isPrismaUniqueConstraintViolation(null)).toBe(false);
  });
});
