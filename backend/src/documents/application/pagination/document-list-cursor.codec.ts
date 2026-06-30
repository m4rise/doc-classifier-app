import { z } from 'zod';
import { isUuid } from '../../domain/validation/uuid';
import { InvalidDocumentCursorError } from '../errors/list-documents.errors';
import { DocumentListCursor } from '../ports/document.repository.port';

const serializedDocumentCursorSchema = z
  .object({
    id: z.string().refine(isUuid),
    createdAt: z.string().refine(isCanonicalIsoDate),
  })
  .strict();

export function encodeDocumentListCursor(cursor: DocumentListCursor): string {
  const payload = {
    id: cursor.id,
    createdAt: cursor.createdAt.toISOString(),
  };

  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
}

export function decodeDocumentListCursor(cursor: string): DocumentListCursor {
  try {
    const decoded = Buffer.from(cursor, 'base64');

    if (decoded.toString('base64') !== cursor) {
      throw new InvalidDocumentCursorError();
    }

    const payload: unknown = JSON.parse(decoded.toString('utf8'));
    const parsed = serializedDocumentCursorSchema.parse(payload);

    return {
      id: parsed.id,
      createdAt: new Date(parsed.createdAt),
    };
  } catch {
    throw new InvalidDocumentCursorError();
  }
}

function isCanonicalIsoDate(value: string): boolean {
  const date = new Date(value);

  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}
