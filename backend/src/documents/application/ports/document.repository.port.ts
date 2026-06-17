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

export abstract class DocumentRepository {
  abstract createPending(
    input: CreatePendingDocumentInput,
  ): Promise<UploadedDocument>;
}
