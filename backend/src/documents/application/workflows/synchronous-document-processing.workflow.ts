import type { DocumentDetails } from '../ports/document.repository.port';
import {
  UploadDocumentInput,
  UploadDocumentUseCase,
} from '../use-cases/upload-document.use-case';
import { ProcessDocumentUseCase } from '../use-cases/process-document.use-case';

/**
 * Temporary synchronous composition required by the MVP HTTP contract.
 *
 * Upload and processing remain independent use cases so a future durable
 * dispatcher can invoke ProcessDocumentUseCase from a worker without changing
 * either business operation.
 */
export class SynchronousDocumentProcessingWorkflow {
  constructor(
    private readonly uploadDocument: UploadDocumentUseCase,
    private readonly processDocument: ProcessDocumentUseCase,
  ) {}

  async execute(input: UploadDocumentInput): Promise<DocumentDetails> {
    const pendingDocument = await this.uploadDocument.execute(input);
    return this.processDocument.execute(pendingDocument.id);
  }
}
