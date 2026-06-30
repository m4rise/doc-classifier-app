import type { DocumentStatus } from '../../../generated/prisma';
import type {
  DocumentDetail,
  DocumentDetails,
  DocumentListItem,
} from '../../application/ports/document.repository.port';

interface PersistedDocumentDetails {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  processingResult: {
    extractedText: string | null;
    classification: string | null;
    summary: string | null;
    confidenceScore: number | null;
    language: string | null;
    needsReview: boolean;
    errorMessage: string | null;
  } | null;
}

interface PersistedDocumentDetail extends PersistedDocumentDetails {
  storageKey: string;
  createdAt: Date;
  updatedAt: Date;
  processingResult:
    | (NonNullable<PersistedDocumentDetails['processingResult']> & {
        processedAt: Date;
      })
    | null;
}

interface PersistedDocumentListItem {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  createdAt: Date;
  processingResult: {
    classification: string | null;
    confidenceScore: number | null;
    needsReview: boolean;
  } | null;
}

export const documentDetailsSelection = {
  id: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  status: true,
  processingResult: {
    select: {
      extractedText: true,
      classification: true,
      summary: true,
      confidenceScore: true,
      language: true,
      needsReview: true,
      errorMessage: true,
    },
  },
} as const;

export const documentListItemSelection = {
  id: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  status: true,
  createdAt: true,
  processingResult: {
    select: {
      classification: true,
      confidenceScore: true,
      needsReview: true,
    },
  },
} as const;

export const documentDetailSelection = {
  id: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  storageKey: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  processingResult: {
    select: {
      extractedText: true,
      classification: true,
      summary: true,
      confidenceScore: true,
      language: true,
      needsReview: true,
      errorMessage: true,
      processedAt: true,
    },
  },
} as const;

export function mapDocumentDetails(
  document: PersistedDocumentDetails,
): DocumentDetails {
  return {
    id: document.id,
    status: document.status,
    originalName: document.originalName,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    extractedText: document.processingResult?.extractedText ?? null,
    classification: document.processingResult?.classification ?? null,
    summary: document.processingResult?.summary ?? null,
    confidenceScore: document.processingResult?.confidenceScore ?? null,
    language: document.processingResult?.language ?? null,
    needsReview: document.processingResult?.needsReview ?? false,
    errorMessage: document.processingResult?.errorMessage ?? null,
  };
}

export function mapDocumentDetail(
  document: PersistedDocumentDetail,
): DocumentDetail {
  return {
    ...mapDocumentDetails(document),
    storageKey: document.storageKey,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    processedAt: document.processingResult?.processedAt ?? null,
  };
}

export function mapDocumentListItem(
  document: PersistedDocumentListItem,
): DocumentListItem {
  return {
    id: document.id,
    status: document.status,
    originalName: document.originalName,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    classification: document.processingResult?.classification ?? null,
    confidenceScore: document.processingResult?.confidenceScore ?? null,
    needsReview: document.processingResult?.needsReview ?? false,
    createdAt: document.createdAt,
  };
}
