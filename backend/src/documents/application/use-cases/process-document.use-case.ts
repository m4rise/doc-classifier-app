import {
  DocumentAnalysisTimeoutError,
  InvalidDocumentAnalysisError,
} from '../errors/document-analysis.errors';
import {
  DocumentAnalysisResult,
  DocumentAnalyzer,
} from '../ports/document-analyzer.port';
import { FileStorage } from '../ports/file-storage.port';
import { DocumentNotPendingError } from '../../domain/errors/process-document.errors';
import {
  DocumentDetails,
  DocumentRepository,
} from '../ports/document.repository.port';

export class ProcessDocumentUseCase {
  constructor(
    private readonly documentAnalyzer: DocumentAnalyzer,
    private readonly documentRepository: DocumentRepository,
    private readonly fileStorage: FileStorage,
    private readonly confidenceThreshold: number,
  ) {}

  async execute(documentId: string): Promise<DocumentDetails> {
    const document = await this.documentRepository.beginProcessing(documentId);

    if (!document) {
      throw new DocumentNotPendingError(documentId);
    }

    let analysis: DocumentAnalysisResult;

    try {
      const fileBuffer = await this.fileStorage.download(document.storageKey);
      analysis = await this.documentAnalyzer.analyze({
        fileBuffer,
        mimeType: document.mimeType,
      });
    } catch (error) {
      return this.documentRepository.failProcessing(
        documentId,
        sanitizeProcessingError(error),
      );
    }

    return this.documentRepository.completeProcessing(documentId, {
      ...analysis,
      needsReview: shouldReviewLowConfidence(
        analysis.confidenceScore,
        this.confidenceThreshold,
      ),
    });
  }
}

function shouldReviewLowConfidence(
  confidenceScore: number,
  confidenceThreshold: number,
): boolean {
  return confidenceScore < confidenceThreshold;
}

function sanitizeProcessingError(error: unknown): string {
  if (error instanceof DocumentAnalysisTimeoutError) {
    return 'LLM analysis timed out';
  }

  if (error instanceof InvalidDocumentAnalysisError) {
    return 'LLM response failed schema validation';
  }

  return 'Document processing failed';
}
