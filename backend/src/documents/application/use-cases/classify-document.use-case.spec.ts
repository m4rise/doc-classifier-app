import { IFileStorage } from '../../../shared/interfaces/IFileStorage';
import {
  LlmSchemaValidationError,
  LlmTimeoutError,
} from '../../../shared/errors/llm.errors';
import {
  ILlmProvider,
  LlmAnalysisResult,
} from '../../../shared/interfaces/ILlmProvider';
import { DocumentNotPendingError } from '../../domain/errors/process-document.errors';
import {
  DocumentDetails,
  DocumentRepository,
} from '../ports/document.repository.port';
import { ClassifyDocumentUseCase } from './classify-document.use-case';

describe('ClassifyDocumentUseCase', () => {
  const documentId = 'document-1';
  const storageKey = '8e61e3f1-8f3f-4a2b-99db-0d5deff2db38';
  const fileBuffer = Buffer.from('%PDF-1.4\n%%EOF', 'utf8');
  const analysis: LlmAnalysisResult = {
    extractedText: 'Invoice #2026-001',
    classification: 'invoice',
    summary: 'Invoice for professional services.',
    confidenceScore: 0.94,
    language: 'en',
  };

  function createHarness() {
    const calls: string[] = [];
    const beginProcessing: jest.MockedFunction<
      DocumentRepository['beginProcessing']
    > = jest.fn(() => {
      calls.push('beginProcessing');
      return Promise.resolve({
        id: documentId,
        storageKey,
        mimeType: 'application/pdf',
      });
    });
    const completeProcessing: jest.MockedFunction<
      DocumentRepository['completeProcessing']
    > = jest.fn(() => {
      calls.push('completeProcessing');
      return Promise.resolve(createDocumentDetails('DONE', analysis, null));
    });
    const failProcessing: jest.MockedFunction<
      DocumentRepository['failProcessing']
    > = jest.fn((_id, errorMessage) => {
      calls.push('failProcessing');
      return Promise.resolve(
        createDocumentDetails('FAILED', null, errorMessage),
      );
    });
    const documentRepository: DocumentRepository = {
      beginProcessing,
      completeProcessing,
      createPending: jest.fn(),
      failProcessing,
      findByIdForUser: jest.fn(),
    };
    const download: jest.MockedFunction<IFileStorage['download']> = jest.fn(
      () => {
        calls.push('download');
        return Promise.resolve(fileBuffer);
      },
    );
    const fileStorage: IFileStorage = {
      download,
      getSignedUrl: jest.fn(),
      upload: jest.fn(),
    };
    const analyzeDocument: jest.MockedFunction<
      ILlmProvider['analyzeDocument']
    > = jest.fn(() => {
      calls.push('analyzeDocument');
      return Promise.resolve(analysis);
    });
    const llmProvider: ILlmProvider = { analyzeDocument };
    const useCase = new ClassifyDocumentUseCase(
      llmProvider,
      documentRepository,
      fileStorage,
    );

    return {
      analyzeDocument,
      beginProcessing,
      calls,
      completeProcessing,
      download,
      failProcessing,
      useCase,
    };
  }

  it('claims PROCESSING before download and atomically completes with analysis', async () => {
    const harness = createHarness();

    await expect(harness.useCase.execute(documentId)).resolves.toEqual(
      createDocumentDetails('DONE', analysis, null),
    );

    expect(harness.calls).toEqual([
      'beginProcessing',
      'download',
      'analyzeDocument',
      'completeProcessing',
    ]);
    expect(harness.download).toHaveBeenCalledWith(storageKey);
    expect(harness.analyzeDocument).toHaveBeenCalledWith({
      fileBuffer,
      mimeType: 'application/pdf',
    });
    expect(harness.completeProcessing).toHaveBeenCalledWith(
      documentId,
      analysis,
    );
    expect(harness.failProcessing).not.toHaveBeenCalled();
  });

  it('persists a sanitized FAILED outcome when Gemini times out', async () => {
    const harness = createHarness();
    const timeoutError = new LlmTimeoutError(8_000);
    harness.analyzeDocument.mockRejectedValueOnce(timeoutError);

    await expect(harness.useCase.execute(documentId)).resolves.toEqual(
      createDocumentDetails('FAILED', null, 'LLM analysis timed out'),
    );

    expect(harness.failProcessing).toHaveBeenCalledWith(
      documentId,
      'LLM analysis timed out',
    );
    expect(harness.completeProcessing).not.toHaveBeenCalled();
  });

  it('persists a sanitized FAILED outcome for Zod/schema validation errors', async () => {
    const harness = createHarness();
    const schemaError = new LlmSchemaValidationError(
      new Error('raw malformed response'),
    );
    harness.analyzeDocument.mockRejectedValueOnce(schemaError);

    await expect(harness.useCase.execute(documentId)).resolves.toEqual(
      createDocumentDetails(
        'FAILED',
        null,
        'LLM response failed schema validation',
      ),
    );

    expect(harness.failProcessing).toHaveBeenCalledWith(
      documentId,
      'LLM response failed schema validation',
    );
  });

  it('does not read or analyze a document that cannot be claimed from PENDING', async () => {
    const harness = createHarness();
    harness.beginProcessing.mockResolvedValueOnce(null);

    await expect(harness.useCase.execute(documentId)).rejects.toBeInstanceOf(
      DocumentNotPendingError,
    );

    expect(harness.download).not.toHaveBeenCalled();
    expect(harness.analyzeDocument).not.toHaveBeenCalled();
    expect(harness.completeProcessing).not.toHaveBeenCalled();
    expect(harness.failProcessing).not.toHaveBeenCalled();
  });
});

function createDocumentDetails(
  status: 'DONE' | 'FAILED',
  analysis: LlmAnalysisResult | null,
  errorMessage: string | null,
): DocumentDetails {
  return {
    id: 'document-1',
    status,
    originalName: 'invoice.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 24,
    extractedText: analysis?.extractedText ?? null,
    classification: analysis?.classification ?? null,
    summary: analysis?.summary ?? null,
    confidenceScore: analysis?.confidenceScore ?? null,
    language: analysis?.language ?? null,
    errorMessage,
  };
}
