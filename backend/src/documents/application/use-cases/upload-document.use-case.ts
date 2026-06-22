import { randomUUID } from 'crypto';
import { IFileStorage } from '../../../shared/interfaces/IFileStorage';
import {
  FileTooLargeError,
  InvalidFileTypeError,
} from '../../domain/errors/upload-document.errors';
import { validateDocumentFileType } from '../../domain/services/document-file-policy';
import {
  DocumentDetails,
  DocumentRepository,
} from '../ports/document.repository.port';
import { FileTypeDetector } from '../ports/file-type-detector.port';
import { ClassifyDocumentUseCase } from './classify-document.use-case';

export interface UploadDocumentInput {
  userId: string;
  originalName: string;
  buffer: Buffer;
  sizeBytes: number;
}

export type UploadDocumentOutput = DocumentDetails;

export class UploadDocumentUseCase {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly fileStorage: IFileStorage,
    private readonly fileTypeDetector: FileTypeDetector,
    private readonly fileSizeLimitBytes: number,
    private readonly classifyDocumentUseCase: ClassifyDocumentUseCase,
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

    const document = await this.documentRepository.createPending({
      userId: input.userId,
      originalName: input.originalName,
      mimeType: validatedFileType.mimeType,
      sizeBytes: input.sizeBytes,
      storageKey,
    });

    return this.classifyDocumentUseCase.execute(document.id);
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
