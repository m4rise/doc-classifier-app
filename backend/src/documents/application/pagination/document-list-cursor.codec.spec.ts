import { InvalidDocumentCursorError } from '../errors/list-documents.errors';
import {
  decodeDocumentListCursor,
  encodeDocumentListCursor,
} from './document-list-cursor.codec';

describe('document list cursor codec', () => {
  const cursor = {
    id: '22222222-2222-4222-8222-222222222222',
    createdAt: new Date('2026-06-24T09:00:00.000Z'),
  };

  it('preserves the existing Base64 JSON cursor format', () => {
    const encoded = encodeDocumentListCursor(cursor);

    expect(encoded).toBe(
      Buffer.from(
        JSON.stringify({
          id: cursor.id,
          createdAt: cursor.createdAt.toISOString(),
        }),
        'utf8',
      ).toString('base64'),
    );
    expect(decodeDocumentListCursor(encoded)).toEqual(cursor);
  });

  it.each([
    ['non-canonical Base64', 'not-a-base64-cursor'],
    ['invalid JSON', Buffer.from('{', 'utf8').toString('base64')],
    ['non-object payload', encodePayload(null)],
    [
      'missing field',
      encodePayload({
        id: cursor.id,
      }),
    ],
    [
      'unexpected field',
      encodePayload({
        id: cursor.id,
        createdAt: cursor.createdAt.toISOString(),
        userId: 'attacker-controlled',
      }),
    ],
    [
      'invalid id',
      encodePayload({
        id: 'document-1',
        createdAt: cursor.createdAt.toISOString(),
      }),
    ],
    [
      'invalid date',
      encodePayload({
        id: cursor.id,
        createdAt: 'not-a-date',
      }),
    ],
    [
      'non-canonical date',
      encodePayload({
        id: cursor.id,
        createdAt: '2026-06-24T09:00:00Z',
      }),
    ],
  ])('rejects %s with the existing business error', (_label, encoded) => {
    expect(() => decodeDocumentListCursor(encoded)).toThrow(
      InvalidDocumentCursorError,
    );
  });
});

function encodePayload(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
}
