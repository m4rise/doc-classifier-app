import {
  FileTooLargeError,
  InvalidFileTypeError,
} from '../../domain/errors/upload-document.errors';
import {
  DocumentRepository,
  UploadedDocument,
} from '../ports/document.repository.port';
import { FileStorage } from '../ports/file-storage.port';
import { FileTypeDetector } from '../ports/file-type-detector.port';
import { UploadDocumentUseCase } from './upload-document.use-case';

describe('UploadDocumentUseCase', () => {
  const validPdfBuffer = Buffer.from('%PDF-1.4\n%%EOF', 'utf8');
  const storageKey = '8e61e3f1-8f3f-4a2b-99db-0d5deff2db38';
  const pendingDocument: UploadedDocument = {
    id: 'document-1',
    status: 'PENDING',
    originalName: 'invoice.pdf',
    mimeType: 'application/pdf',
    sizeBytes: validPdfBuffer.length,
  };

  function createUseCase(fileSizeLimitBytes = 1024) {
    const calls: string[] = [];
    const createPending: jest.MockedFunction<
      DocumentRepository['createPending']
    > = jest.fn(() => {
      calls.push('createPending');
      return Promise.resolve(pendingDocument);
    });
    const documentRepository: DocumentRepository = {
      beginProcessing: jest.fn(),
      completeProcessing: jest.fn(),
      createPending,
      failProcessing: jest.fn(),
      findByIdForUser: jest.fn(),
      listForUser: jest.fn(),
    };
    const upload: jest.MockedFunction<FileStorage['upload']> = jest.fn(() => {
      calls.push('upload');
      return Promise.resolve();
    });
    const fileStorage: FileStorage = {
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
    const useCase = new UploadDocumentUseCase(
      documentRepository,
      fileStorage,
      { detect },
      fileSizeLimitBytes,
      () => storageKey,
    );

    return { calls, createPending, detect, upload, useCase };
  }

  it('stores a valid PDF and returns the independently created PENDING document', async () => {
    const { calls, createPending, upload, useCase } = createUseCase();

    await expect(
      useCase.execute({
        userId: 'user-1',
        originalName: 'invoice.pdf',
        buffer: validPdfBuffer,
        sizeBytes: validPdfBuffer.length,
      }),
    ).resolves.toEqual(pendingDocument);

    expect(calls).toEqual(['upload', 'createPending']);
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
    expect(storageKey).not.toBe('invoice.pdf');
  });

  it('rejects mismatched extension and magic bytes before storage', async () => {
    const { createPending, detect, upload, useCase } = createUseCase();

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
  });

  it('rejects oversized files before magic byte detection or storage', async () => {
    const { createPending, detect, upload, useCase } = createUseCase(10);

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
  });
});
