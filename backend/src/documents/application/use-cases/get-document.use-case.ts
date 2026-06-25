import { DocumentNotFoundError } from '../../domain/errors/process-document.errors';
import {
  DocumentDetailResult,
  DocumentRepository,
} from '../ports/document.repository.port';
import { FileStorage } from '../ports/file-storage.port';

const DOCUMENT_DOWNLOAD_URL_TTL_SECONDS = 900;

export class GetDocumentUseCase {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly fileStorage: FileStorage,
  ) {}

  async execute(
    documentId: string,
    userId: string,
  ): Promise<DocumentDetailResult> {
    const document = await this.documentRepository.findByIdForUser(
      documentId,
      userId,
    );

    if (!document) {
      throw new DocumentNotFoundError(documentId);
    }

    const downloadUrl = await this.fileStorage.getSignedUrl(
      document.storageKey,
      DOCUMENT_DOWNLOAD_URL_TTL_SECONDS,
    );
    const { storageKey, ...publicDocument } = document;
    void storageKey;

    return {
      ...publicDocument,
      downloadUrl,
    };
  }
}
