import {
  DocumentAnalysisTimeoutError,
  InvalidDocumentAnalysisError,
} from '../errors/document-analysis.errors';
import {
  DocumentAnalysisResult,
  DocumentAnalyzer,
} from '../ports/document-analyzer.port';
import { DocumentNotPendingError } from '../../domain/errors/process-document.errors';
import {
  DocumentDetails,
  DocumentRepository,
} from '../ports/document.repository.port';
import { FileStorage } from '../ports/file-storage.port';
import { ProcessDocumentUseCase } from './process-document.use-case';

describe('ProcessDocumentUseCase', () => {
  const documentId = 'document-1';
  const storageKey = '8e61e3f1-8f3f-4a2b-99db-0d5deff2db38';
  const fileBuffer = Buffer.from('%PDF-1.4\n%%EOF', 'utf8');
  const analysis: DocumentAnalysisResult = {
    extractedText: 'Invoice #2026-001',
    classification: 'invoice',
    summary: 'Invoice for professional services.',
    confidenceScore: 0.94,
    language: 'en',
  };

  function createHarness(confidenceThreshold = 0.7) {
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
      return Promise.resolve(
        createDocumentDetails(
          'DONE',
          analysis,
          analysis.confidenceScore < confidenceThreshold,
          null,
        ),
      );
    });
    const failProcessing: jest.MockedFunction<
      DocumentRepository['failProcessing']
    > = jest.fn((_id, errorMessage) => {
      calls.push('failProcessing');
      return Promise.resolve(
        createDocumentDetails('FAILED', null, false, errorMessage),
      );
    });
    const documentRepository: DocumentRepository = {
      beginProcessing,
      completeProcessing,
      createPending: jest.fn(),
      failProcessing,
      findByIdForUser: jest.fn(),
    };
    const download: jest.MockedFunction<FileStorage['download']> = jest.fn(
      () => {
        calls.push('download');
        return Promise.resolve(fileBuffer);
      },
    );
    const fileStorage: FileStorage = {
      download,
      getSignedUrl: jest.fn(),
      upload: jest.fn(),
    };
    const analyze: jest.MockedFunction<DocumentAnalyzer['analyze']> = jest.fn(
      () => {
        calls.push('analyze');
        return Promise.resolve(analysis);
      },
    );
    const documentAnalyzer: DocumentAnalyzer = { analyze };
    const useCase = new ProcessDocumentUseCase(
      documentAnalyzer,
      documentRepository,
      fileStorage,
      confidenceThreshold,
    );

    return {
      analyze,
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
      createDocumentDetails('DONE', analysis, false, null),
    );

    expect(harness.calls).toEqual([
      'beginProcessing',
      'download',
      'analyze',
      'completeProcessing',
    ]);
    expect(harness.download).toHaveBeenCalledWith(storageKey);
    expect(harness.analyze).toHaveBeenCalledWith({
      fileBuffer,
      mimeType: 'application/pdf',
    });
    expect(harness.completeProcessing).toHaveBeenCalledWith(documentId, {
      ...analysis,
      needsReview: false,
    });
    expect(harness.failProcessing).not.toHaveBeenCalled();
  });

  it('flags a document for manual review when confidenceScore is below the threshold', async () => {
    const lowConfidenceAnalysis = { ...analysis, confidenceScore: 0.58 };
    const harness = createHarness();
    harness.analyze.mockResolvedValueOnce(lowConfidenceAnalysis);
    harness.completeProcessing.mockResolvedValueOnce(
      createDocumentDetails('DONE', lowConfidenceAnalysis, true, null),
    );

    await expect(harness.useCase.execute(documentId)).resolves.toEqual(
      createDocumentDetails('DONE', lowConfidenceAnalysis, true, null),
    );

    expect(harness.completeProcessing).toHaveBeenCalledWith(documentId, {
      ...lowConfidenceAnalysis,
      needsReview: true,
    });
  });

  it('does not flag a document when confidenceScore equals the threshold', async () => {
    const thresholdAnalysis = { ...analysis, confidenceScore: 0.7 };
    const harness = createHarness();
    harness.analyze.mockResolvedValueOnce(thresholdAnalysis);
    harness.completeProcessing.mockResolvedValueOnce(
      createDocumentDetails('DONE', thresholdAnalysis, false, null),
    );

    await expect(harness.useCase.execute(documentId)).resolves.toEqual(
      createDocumentDetails('DONE', thresholdAnalysis, false, null),
    );

    expect(harness.completeProcessing).toHaveBeenCalledWith(documentId, {
      ...thresholdAnalysis,
      needsReview: false,
    });
  });

  it('uses the injected threshold when deciding if a document needs review', async () => {
    const thresholdAnalysis = { ...analysis, confidenceScore: 0.8 };
    const harness = createHarness(0.85);
    harness.analyze.mockResolvedValueOnce(thresholdAnalysis);
    harness.completeProcessing.mockResolvedValueOnce(
      createDocumentDetails('DONE', thresholdAnalysis, true, null),
    );

    await expect(harness.useCase.execute(documentId)).resolves.toEqual(
      createDocumentDetails('DONE', thresholdAnalysis, true, null),
    );

    expect(harness.completeProcessing).toHaveBeenCalledWith(documentId, {
      ...thresholdAnalysis,
      needsReview: true,
    });
  });

  it('persists a sanitized FAILED outcome when document analysis times out', async () => {
    const harness = createHarness();
    const timeoutError = new DocumentAnalysisTimeoutError(8_000);
    harness.analyze.mockRejectedValueOnce(timeoutError);

    await expect(harness.useCase.execute(documentId)).resolves.toEqual(
      createDocumentDetails('FAILED', null, false, 'LLM analysis timed out'),
    );

    expect(harness.failProcessing).toHaveBeenCalledWith(
      documentId,
      'LLM analysis timed out',
    );
    expect(harness.completeProcessing).not.toHaveBeenCalled();
  });

  it('persists a sanitized FAILED outcome for Zod/schema validation errors', async () => {
    const harness = createHarness();
    const schemaError = new InvalidDocumentAnalysisError(
      new Error('raw malformed response'),
    );
    harness.analyze.mockRejectedValueOnce(schemaError);

    await expect(harness.useCase.execute(documentId)).resolves.toEqual(
      createDocumentDetails(
        'FAILED',
        null,
        false,
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
    expect(harness.analyze).not.toHaveBeenCalled();
    expect(harness.completeProcessing).not.toHaveBeenCalled();
    expect(harness.failProcessing).not.toHaveBeenCalled();
  });
});

function createDocumentDetails(
  status: 'DONE' | 'FAILED',
  analysis: DocumentAnalysisResult | null,
  needsReview: boolean,
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
    needsReview,
    errorMessage,
  };
}
