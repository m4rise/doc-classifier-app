import { IFileStorage } from '../../../shared/interfaces/IFileStorage';
import {
  FileTooLargeError,
  InvalidFileTypeError,
} from '../../domain/errors/upload-document.errors';
import {
  CreatePendingDocumentInput,
  DocumentDetails,
  DocumentRepository,
  UploadedDocument,
} from '../ports/document.repository.port';
import { FileTypeDetector } from '../ports/file-type-detector.port';
import { ClassifyDocumentUseCase } from './classify-document.use-case';
import { UploadDocumentUseCase } from './upload-document.use-case';

describe('UploadDocumentUseCase', () => {
  const validPdfBuffer = Buffer.from('%PDF-1.4\n%%EOF', 'utf8');
  const storageKey = '8e61e3f1-8f3f-4a2b-99db-0d5deff2db38';
  const completedDocument: DocumentDetails = {
    id: 'document-1',
    status: 'DONE',
    originalName: 'invoice.pdf',
    mimeType: 'application/pdf',
    sizeBytes: validPdfBuffer.length,
    extractedText: 'Invoice #2026-001',
    classification: 'invoice',
    summary: 'Invoice for professional services.',
    confidenceScore: 0.94,
    language: 'en',
    errorMessage: null,
  };

  function createUseCase(fileSizeLimitBytes = 1024) {
    const createPending: jest.MockedFunction<
      DocumentRepository['createPending']
    > = jest.fn((input: CreatePendingDocumentInput) =>
      Promise.resolve<UploadedDocument>({
        id: 'document-1',
        status: 'PENDING',
        originalName: input.originalName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
      }),
    );
    const documentRepository: DocumentRepository = {
      beginProcessing: jest.fn(),
      completeProcessing: jest.fn(),
      createPending,
      failProcessing: jest.fn(),
      findByIdForUser: jest.fn(),
    };
    const upload: jest.MockedFunction<IFileStorage['upload']> = jest.fn(() =>
      Promise.resolve(),
    );
    const fileStorage: IFileStorage = {
      download: jest.fn(),
      getSignedUrl: jest.fn(() => Promise.resolve('file:///tmp/document')),
      upload,
    };
    const detect: jest.MockedFunction<FileTypeDetector['detect']> = jest.fn(
      () =>
        Promise.resolve({
          ext: 'pdf',
          mime: 'application/pdf',
        }),
    );
    const execute = jest.fn(() => Promise.resolve(completedDocument));
    const classifyDocumentUseCase = {
      execute,
    } as unknown as ClassifyDocumentUseCase;
    const useCase = new UploadDocumentUseCase(
      documentRepository,
      fileStorage,
      { detect },
      fileSizeLimitBytes,
      classifyDocumentUseCase,
      () => storageKey,
    );

    return { createPending, detect, execute, upload, useCase };
  }

  it('stores a valid PDF, creates PENDING, then returns the synchronous terminal result', async () => {
    const { createPending, execute, upload, useCase } = createUseCase();

    await expect(
      useCase.execute({
        userId: 'user-1',
        originalName: 'invoice.pdf',
        buffer: validPdfBuffer,
        sizeBytes: validPdfBuffer.length,
      }),
    ).resolves.toEqual(completedDocument);

    expect(upload).toHaveBeenCalledWith(
      storageKey,
      validPdfBuffer,
      'application/pdf',
    );
    expect(createPending).toHaveBeenCalledWith({
      userId: 'user-1',
      originalName: 'invoice.pdf',
      mimeType: 'application/pdf',
      sizeBytes: validPdfBuffer.length,
      storageKey,
    });
    expect(execute).toHaveBeenCalledWith('document-1');
    expect(storageKey).not.toBe('invoice.pdf');
  });

  it('rejects mismatched extension and magic bytes before storage', async () => {
    const { createPending, detect, execute, upload, useCase } = createUseCase();

    detect.mockResolvedValueOnce({
      ext: 'jpg',
      mime: 'image/jpeg',
    });

    await expect(
      useCase.execute({
        userId: 'user-1',
        originalName: 'invoice.pdf',
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
        sizeBytes: 4,
      }),
    ).rejects.toBeInstanceOf(InvalidFileTypeError);

    expect(upload).not.toHaveBeenCalled();
    expect(createPending).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it('rejects oversized files before magic byte detection or storage', async () => {
    const { createPending, detect, execute, upload, useCase } =
      createUseCase(10);

    await expect(
      useCase.execute({
        userId: 'user-1',
        originalName: 'invoice.pdf',
        buffer: Buffer.alloc(11),
        sizeBytes: 11,
      }),
    ).rejects.toBeInstanceOf(FileTooLargeError);

    expect(detect).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
    expect(createPending).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });
});
