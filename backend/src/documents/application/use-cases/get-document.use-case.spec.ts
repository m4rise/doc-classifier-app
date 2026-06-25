import { DocumentNotFoundError } from '../../domain/errors/process-document.errors';
import {
  DocumentDetail,
  DocumentRepository,
} from '../ports/document.repository.port';
import { FileStorage } from '../ports/file-storage.port';
import { GetDocumentUseCase } from './get-document.use-case';

describe('GetDocumentUseCase', () => {
  const document: DocumentDetail = {
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
    needsReview: false,
    errorMessage: null,
    storageKey: '8e61e3f1-8f3f-4a2b-99db-0d5deff2db38',
    createdAt: new Date('2026-06-25T08:00:00.000Z'),
    updatedAt: new Date('2026-06-25T08:01:00.000Z'),
    processedAt: new Date('2026-06-25T08:01:00.000Z'),
  };
  const signedUrl = 'https://storage.example.com/signed-document-url';

  const expectedResult = {
    id: document.id,
    status: document.status,
    originalName: document.originalName,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    extractedText: document.extractedText,
    classification: document.classification,
    summary: document.summary,
    confidenceScore: document.confidenceScore,
    language: document.language,
    needsReview: document.needsReview,
    errorMessage: document.errorMessage,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    processedAt: document.processedAt,
    downloadUrl: signedUrl,
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
      listForUser: jest.fn(),
    };
    const getSignedUrl: jest.MockedFunction<FileStorage['getSignedUrl']> =
      jest.fn(() => Promise.resolve(signedUrl));
    const fileStorage: FileStorage = {
      download: jest.fn(),
      getSignedUrl,
      upload: jest.fn(),
    };

    return {
      findByIdForUser,
      getSignedUrl,
      useCase: new GetDocumentUseCase(repository, fileStorage),
    };
  }

  it('returns an owner-scoped document detail with a 900-second signed download URL', async () => {
    const { findByIdForUser, getSignedUrl, useCase } = createHarness();

    await expect(useCase.execute('document-1', 'user-1')).resolves.toEqual(
      expectedResult,
    );
    expect(findByIdForUser).toHaveBeenCalledWith('document-1', 'user-1');
    expect(getSignedUrl).toHaveBeenCalledWith(document.storageKey, 900);
  });

  it('uses the same not-found result for missing and non-owned documents', async () => {
    const { findByIdForUser, getSignedUrl, useCase } = createHarness();
    findByIdForUser.mockResolvedValueOnce(null);

    await expect(
      useCase.execute('document-1', 'different-user'),
    ).rejects.toBeInstanceOf(DocumentNotFoundError);
    expect(getSignedUrl).not.toHaveBeenCalled();
  });

  it('returns FAILED document details with the processing error message', async () => {
    const { findByIdForUser, useCase } = createHarness();
    const failedDocument: DocumentDetail = {
      ...document,
      status: 'FAILED',
      extractedText: null,
      classification: null,
      summary: null,
      confidenceScore: null,
      language: null,
      needsReview: false,
      errorMessage: 'LLM analysis timed out',
    };
    findByIdForUser.mockResolvedValueOnce(failedDocument);

    await expect(
      useCase.execute('document-1', 'user-1'),
    ).resolves.toMatchObject({
      status: 'FAILED',
      errorMessage: 'LLM analysis timed out',
      downloadUrl: signedUrl,
    });
  });
});
