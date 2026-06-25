import type {
  DocumentDetailResult,
  DocumentStatus,
} from '../../application/ports/document.repository.port';

export class DocumentDetailResponseDto implements DocumentDetailResult {
  id!: string;
  status!: DocumentStatus;
  originalName!: string;
  mimeType!: string;
  sizeBytes!: number;
  extractedText!: string | null;
  classification!: string | null;
  summary!: string | null;
  confidenceScore!: number | null;
  language!: string | null;
  needsReview!: boolean;
  errorMessage!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  processedAt!: Date | null;
  downloadUrl!: string;
}
