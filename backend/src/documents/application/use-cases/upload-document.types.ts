import type { UploadedDocument } from '../ports/document.repository.port';

export interface UploadDocumentInput {
  userId: string;
  originalName: string;
  buffer: Buffer;
  sizeBytes: number;
}

export type UploadDocumentOutput = UploadedDocument;
