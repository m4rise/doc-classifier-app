import { DocumentNotFoundError } from '../../domain/errors/process-document.errors';
import {
  DocumentDetails,
  DocumentRepository,
} from '../ports/document.repository.port';
import { GetDocumentUseCase } from './get-document.use-case';

describe('GetDocumentUseCase', () => {
  const document: DocumentDetails = {
    id: 'document-1',
    status: 'DONE',
    originalName: 'invoice.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 24,
    extractedText: 'Invoice #2026-001',
    classification: 'invoice',
    summary: 'Invoice for professional services.',
    confidenceScore: 0.94,
    language: 'en',
    errorMessage: null,
  };

  function createHarness() {
    const findByIdForUser: jest.MockedFunction<
      DocumentRepository['findByIdForUser']
    > = jest.fn(() => Promise.resolve(document));
    const repository: DocumentRepository = {
      beginProcessing: jest.fn(),
      completeProcessing: jest.fn(),
      createPending: jest.fn(),
      failProcessing: jest.fn(),
      findByIdForUser,
    };

    return {
      findByIdForUser,
      useCase: new GetDocumentUseCase(repository),
    };
  }

  it('returns an owner-scoped document with its processing outcome', async () => {
    const { findByIdForUser, useCase } = createHarness();

    await expect(useCase.execute('document-1', 'user-1')).resolves.toEqual(
      document,
    );
    expect(findByIdForUser).toHaveBeenCalledWith('document-1', 'user-1');
  });

  it('uses the same not-found result for missing and non-owned documents', async () => {
    const { findByIdForUser, useCase } = createHarness();
    findByIdForUser.mockResolvedValueOnce(null);

    await expect(
      useCase.execute('document-1', 'different-user'),
    ).rejects.toBeInstanceOf(DocumentNotFoundError);
  });
});
