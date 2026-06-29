import { InvalidDocumentCursorError } from '../errors/list-documents.errors';
import {
  decodeDocumentListCursor,
  encodeDocumentListCursor,
} from '../pagination/document-list-cursor.codec';
import {
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

export class ListDocumentsUseCase {
  constructor(private readonly documentRepository: DocumentRepository) {}

  async execute(input: ListDocumentsInput): Promise<ListDocumentsResult> {
    const cursor = input.cursor
      ? decodeDocumentListCursor(input.cursor)
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
        hasNextPage && lastDocument
          ? encodeDocumentListCursor(lastDocument)
          : null,
      total: result.total,
    };
  }
}
