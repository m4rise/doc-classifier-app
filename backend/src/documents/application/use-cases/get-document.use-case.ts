import { DocumentNotFoundError } from '../../domain/errors/process-document.errors';
import {
  DocumentDetails,
  DocumentRepository,
} from '../ports/document.repository.port';

export class GetDocumentUseCase {
  constructor(private readonly documentRepository: DocumentRepository) {}

  async execute(documentId: string, userId: string): Promise<DocumentDetails> {
    const document = await this.documentRepository.findByIdForUser(
      documentId,
      userId,
    );

    if (!document) {
      throw new DocumentNotFoundError(documentId);
    }

    return document;
  }
}
