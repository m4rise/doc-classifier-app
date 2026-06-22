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

export class ClassifyDocumentUseCase {
  constructor(
    private readonly llmProvider: ILlmProvider,
    private readonly documentRepository: DocumentRepository,
    private readonly fileStorage: IFileStorage,
  ) {}

  async execute(documentId: string): Promise<DocumentDetails> {
    const document = await this.documentRepository.beginProcessing(documentId);

    if (!document) {
      throw new DocumentNotPendingError(documentId);
    }

    let analysis: LlmAnalysisResult;

    try {
      const fileBuffer = await this.fileStorage.download(document.storageKey);
      analysis = await this.llmProvider.analyzeDocument({
        fileBuffer,
        mimeType: document.mimeType,
      });
    } catch (error) {
      return this.documentRepository.failProcessing(
        documentId,
        sanitizeProcessingError(error),
      );
    }

    return this.documentRepository.completeProcessing(documentId, analysis);
  }
}

function sanitizeProcessingError(error: unknown): string {
  if (error instanceof LlmTimeoutError) {
    return 'LLM analysis timed out';
  }

  if (error instanceof LlmSchemaValidationError) {
    return 'LLM response failed schema validation';
  }

  return 'Document processing failed';
}
