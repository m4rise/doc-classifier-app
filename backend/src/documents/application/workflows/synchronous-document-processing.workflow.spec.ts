import type {
  DocumentDetails,
  UploadedDocument,
} from '../ports/document.repository.port';
import type { ProcessDocumentUseCase } from '../use-cases/process-document.use-case';
import type { UploadDocumentUseCase } from '../use-cases/upload-document.use-case';
import { SynchronousDocumentProcessingWorkflow } from './synchronous-document-processing.workflow';

describe('SynchronousDocumentProcessingWorkflow', () => {
  it('composes the independent upload and processing use cases for the MVP', async () => {
    const calls: string[] = [];
    const pendingDocument: UploadedDocument = {
      id: 'document-1',
      status: 'PENDING',
      originalName: 'invoice.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 4,
    };
    const completedDocument = {
      ...pendingDocument,
      status: 'DONE',
      extractedText: 'Invoice',
      classification: 'invoice',
      summary: 'Invoice summary',
      confidenceScore: 0.9,
      language: 'en',
      errorMessage: null,
    } satisfies DocumentDetails;
    const uploadDocument = {
      execute: jest.fn(() => {
        calls.push('upload');
        return Promise.resolve(pendingDocument);
      }),
    } as unknown as UploadDocumentUseCase;
    const processExecute = jest.fn(() => {
      calls.push('process');
      return Promise.resolve(completedDocument);
    });
    const processDocument = {
      execute: processExecute,
    } as unknown as ProcessDocumentUseCase;
    const workflow = new SynchronousDocumentProcessingWorkflow(
      uploadDocument,
      processDocument,
    );

    await expect(
      workflow.execute({
        userId: 'user-1',
        originalName: 'invoice.pdf',
        buffer: Buffer.from('test'),
        sizeBytes: 4,
      }),
    ).resolves.toEqual(completedDocument);

    expect(calls).toEqual(['upload', 'process']);
    expect(processExecute).toHaveBeenCalledWith('document-1');
  });
});
