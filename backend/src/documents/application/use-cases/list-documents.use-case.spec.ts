import { InvalidDocumentCursorError } from '../errors/list-documents.errors';
import {
  DocumentListItem,
  DocumentRepository,
} from '../ports/document.repository.port';
import { ListDocumentsUseCase } from './list-documents.use-case';

describe('ListDocumentsUseCase', () => {
  const firstDocument = createDocument(
    '11111111-1111-4111-8111-111111111111',
    '2026-06-24T10:00:00.000Z',
  );
  const secondDocument = createDocument(
    '22222222-2222-4222-8222-222222222222',
    '2026-06-24T09:00:00.000Z',
  );
  const lookaheadDocument = createDocument(
    '33333333-3333-4333-8333-333333333333',
    '2026-06-24T08:00:00.000Z',
  );

  function createHarness() {
    const listForUser: jest.MockedFunction<DocumentRepository['listForUser']> =
      jest.fn(() =>
        Promise.resolve({
          documents: [firstDocument, secondDocument, lookaheadDocument],
          total: 12,
        }),
      );
    const repository: DocumentRepository = {
      beginProcessing: jest.fn(),
      completeProcessing: jest.fn(),
      createPending: jest.fn(),
      failProcessing: jest.fn(),
      findByIdForUser: jest.fn(),
      listForUser,
    };

    return {
      listForUser,
      useCase: new ListDocumentsUseCase(repository),
    };
  }

  it('returns the requested page, total, and a cursor from the final visible item', async () => {
    const { listForUser, useCase } = createHarness();

    const result = await useCase.execute({
      userId: 'user-1',
      limit: 2,
    });

    expect(result.data).toEqual([firstDocument, secondDocument]);
    expect(typeof result.nextCursor).toBe('string');
    expect(result.total).toBe(12);
    expect(decodeCursor(result.nextCursor)).toEqual({
      id: secondDocument.id,
      createdAt: secondDocument.createdAt.toISOString(),
    });
    expect(listForUser).toHaveBeenCalledWith({
      userId: 'user-1',
      limit: 2,
      cursor: undefined,
    });
  });

  it('decodes the opaque cursor while keeping ownership derived from the caller', async () => {
    const { listForUser, useCase } = createHarness();
    listForUser.mockResolvedValueOnce({ documents: [], total: 12 });
    const cursor = encodeCursor(secondDocument);

    await expect(
      useCase.execute({ userId: 'owner-1', limit: 5, cursor }),
    ).resolves.toEqual({ data: [], nextCursor: null, total: 12 });
    expect(listForUser).toHaveBeenCalledWith({
      userId: 'owner-1',
      limit: 5,
      cursor: {
        id: secondDocument.id,
        createdAt: secondDocument.createdAt,
      },
    });
  });

  it('returns no next cursor when the repository has no lookahead row', async () => {
    const { listForUser, useCase } = createHarness();
    listForUser.mockResolvedValueOnce({
      documents: [firstDocument, secondDocument],
      total: 2,
    });

    await expect(
      useCase.execute({ userId: 'user-1', limit: 2 }),
    ).resolves.toEqual({
      data: [firstDocument, secondDocument],
      nextCursor: null,
      total: 2,
    });
  });

  it('does not query the repository when the cursor codec rejects input', async () => {
    const { listForUser, useCase } = createHarness();

    await expect(
      useCase.execute({
        userId: 'user-1',
        limit: 20,
        cursor: 'not-a-base64-cursor',
      }),
    ).rejects.toBeInstanceOf(InvalidDocumentCursorError);
    expect(listForUser).not.toHaveBeenCalled();
  });

  it('rejects a stale or non-owned cursor reported by the repository', async () => {
    const { listForUser, useCase } = createHarness();
    listForUser.mockResolvedValueOnce(null);

    await expect(
      useCase.execute({
        userId: 'user-1',
        limit: 20,
        cursor: encodeCursor(secondDocument),
      }),
    ).rejects.toBeInstanceOf(InvalidDocumentCursorError);
  });
});

function createDocument(id: string, createdAt: string): DocumentListItem {
  return {
    id,
    status: 'DONE',
    originalName: `${id}.pdf`,
    mimeType: 'application/pdf',
    sizeBytes: 128,
    classification: 'invoice',
    confidenceScore: 0.94,
    needsReview: false,
    createdAt: new Date(createdAt),
  };
}

function encodeCursor(document: DocumentListItem): string {
  return encodePayload({
    id: document.id,
    createdAt: document.createdAt.toISOString(),
  });
}

function encodePayload(payload: object): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
}

function decodeCursor(cursor: string | null): unknown {
  if (!cursor) {
    return null;
  }

  return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) as unknown;
}
