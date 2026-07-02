import { DocumentNotFoundError } from '../../domain/errors/process-document.errors';
import { DocumentRepository } from '../ports/document.repository.port';
import { FileStorage } from '../ports/file-storage.port';

interface StorageDeletionFailureContext {
  err: unknown;
  documentId: string;
  storageKey: string;
}

export interface DocumentDeletionLogger {
  error(context: StorageDeletionFailureContext, message: string): void;
}

export class DeleteDocumentUseCase {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly fileStorage: FileStorage,
    private readonly logger: DocumentDeletionLogger,
  ) {}

  async execute(documentId: string, userId: string): Promise<void> {
    const document = await this.documentRepository.softDeleteForUser(
      documentId,
      userId,
    );

    if (!document) {
      throw new DocumentNotFoundError(documentId);
    }

    try {
      await this.fileStorage.delete(document.storageKey);
    } catch (error) {
      this.logger.error(
        {
          err: error,
          documentId: document.id,
          storageKey: document.storageKey,
        },
        'Document storage deletion failed after database soft-delete',
      );
      return;
    }

    await this.documentRepository.hardDelete(document.id, userId);
  }
}
