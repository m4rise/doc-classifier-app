import { randomUUID } from 'crypto';
import {
  FileTooLargeError,
  InvalidFileTypeError,
} from '../../domain/errors/upload-document.errors';
import { validateDocumentFileType } from '../../domain/services/document-file-policy';
import { DocumentRepository } from '../ports/document.repository.port';
import { FileStorage } from '../ports/file-storage.port';
import { FileTypeDetector } from '../ports/file-type-detector.port';
import type {
  UploadDocumentInput,
  UploadDocumentOutput,
} from './upload-document.types';

export class UploadDocumentUseCase {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly fileStorage: FileStorage,
    private readonly fileTypeDetector: FileTypeDetector,
    private readonly fileSizeLimitBytes: number,
    private readonly generateStorageKey: () => string = randomUUID,
  ) {}

  async execute(input: UploadDocumentInput): Promise<UploadDocumentOutput> {
    this.assertFileSize(input);

    const detectedFileType = await this.fileTypeDetector.detect(input.buffer);
    const validatedFileType = validateDocumentFileType(
      input.originalName,
      detectedFileType,
    );
    const storageKey = this.generateStorageKey();

    await this.fileStorage.upload(
      storageKey,
      input.buffer,
      validatedFileType.mimeType,
    );

    return this.documentRepository.createPending({
      userId: input.userId,
      originalName: input.originalName,
      mimeType: validatedFileType.mimeType,
      sizeBytes: input.sizeBytes,
      storageKey,
    });
  }

  private assertFileSize(input: UploadDocumentInput): void {
    if (input.sizeBytes <= 0 || input.buffer.length === 0) {
      throw new InvalidFileTypeError();
    }

    if (
      input.sizeBytes > this.fileSizeLimitBytes ||
      input.buffer.length > this.fileSizeLimitBytes
    ) {
      throw new FileTooLargeError();
    }
  }
}
