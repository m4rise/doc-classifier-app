import { InvalidDocumentCursorError } from '../errors/list-documents.errors';
import {
  DocumentListCursor,
  DocumentListItem,
  DocumentRepository,
} from '../ports/document.repository.port';

export interface ListDocumentsInput {
  userId: string;
  limit: number;
  cursor?: string;
}

export interface ListDocumentsResult {
  data: DocumentListItem[];
  nextCursor: string | null;
  total: number;
}

interface SerializedDocumentCursor {
  id: string;
  createdAt: string;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ListDocumentsUseCase {
  constructor(private readonly documentRepository: DocumentRepository) {}

  async execute(input: ListDocumentsInput): Promise<ListDocumentsResult> {
    const cursor = input.cursor
      ? decodeDocumentCursor(input.cursor)
      : undefined;
    const result = await this.documentRepository.listForUser({
      userId: input.userId,
      limit: input.limit,
      cursor,
    });

    if (!result) {
      throw new InvalidDocumentCursorError();
    }

    const hasNextPage = result.documents.length > input.limit;
    const data = result.documents.slice(0, input.limit);
    const lastDocument = data.at(-1);

    return {
      data,
      nextCursor:
        hasNextPage && lastDocument ? encodeDocumentCursor(lastDocument) : null,
      total: result.total,
    };
  }
}

function encodeDocumentCursor(cursor: DocumentListCursor): string {
  const payload: SerializedDocumentCursor = {
    id: cursor.id,
    createdAt: cursor.createdAt.toISOString(),
  };

  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
}

function decodeDocumentCursor(cursor: string): DocumentListCursor {
  try {
    const decoded = Buffer.from(cursor, 'base64');

    if (decoded.toString('base64') !== cursor) {
      throw new InvalidDocumentCursorError();
    }

    const payload: unknown = JSON.parse(decoded.toString('utf8'));

    if (!isSerializedDocumentCursor(payload)) {
      throw new InvalidDocumentCursorError();
    }

    const createdAt = new Date(payload.createdAt);

    if (
      Number.isNaN(createdAt.getTime()) ||
      createdAt.toISOString() !== payload.createdAt
    ) {
      throw new InvalidDocumentCursorError();
    }

    return { id: payload.id, createdAt };
  } catch (error) {
    if (error instanceof InvalidDocumentCursorError) {
      throw error;
    }

    throw new InvalidDocumentCursorError();
  }
}

function isSerializedDocumentCursor(
  value: unknown,
): value is SerializedDocumentCursor {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);

  return (
    keys.length === 2 &&
    keys.includes('id') &&
    keys.includes('createdAt') &&
    typeof record.id === 'string' &&
    uuidPattern.test(record.id) &&
    typeof record.createdAt === 'string'
  );
}
