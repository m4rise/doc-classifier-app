import type { LlmAnalysisResult } from '../../../shared/interfaces/ILlmProvider';

export interface CreatePendingDocumentInput {
  userId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
}

export interface UploadedDocument {
  id: string;
  status: 'PENDING';
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';

export interface ProcessingDocument {
  id: string;
  storageKey: string;
  mimeType: string;
}

export interface DocumentDetails {
  id: string;
  status: DocumentStatus;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  extractedText: string | null;
  classification: string | null;
  summary: string | null;
  confidenceScore: number | null;
  language: string | null;
  errorMessage: string | null;
}

export abstract class DocumentRepository {
  abstract createPending(
    input: CreatePendingDocumentInput,
  ): Promise<UploadedDocument>;

  abstract beginProcessing(
    documentId: string,
  ): Promise<ProcessingDocument | null>;

  abstract completeProcessing(
    documentId: string,
    result: LlmAnalysisResult,
  ): Promise<DocumentDetails>;

  abstract failProcessing(
    documentId: string,
    errorMessage: string,
  ): Promise<DocumentDetails>;

  abstract findByIdForUser(
    documentId: string,
    userId: string,
  ): Promise<DocumentDetails | null>;
}
