import type {
  DocumentListItem,
  DocumentStatus,
} from '../../application/ports/document.repository.port';

export class DocumentListItemResponseDto implements DocumentListItem {
  id!: string;
  status!: DocumentStatus;
  originalName!: string;
  mimeType!: string;
  sizeBytes!: number;
  classification!: string | null;
  confidenceScore!: number | null;
  needsReview!: boolean;
  createdAt!: Date;
}

export class ListDocumentsResponseDto {
  data!: DocumentListItemResponseDto[];
  nextCursor!: string | null;
  total!: number;
}
