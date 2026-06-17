import { IFileStorage } from '../../../shared/interfaces/IFileStorage';
import {
  FileTooLargeError,
  InvalidFileTypeError,
} from '../../domain/errors/upload-document.errors';
import {
  CreatePendingDocumentInput,
  DocumentRepository,
  UploadedDocument,
} from '../ports/document.repository.port';
import { FileTypeDetector } from '../ports/file-type-detector.port';
import { UploadDocumentUseCase } from './upload-document.use-case';

describe('UploadDocumentUseCase', () => {
  const validPdfBuffer = Buffer.from('%PDF-1.4\n%%EOF', 'utf8');
  const storageKey = '8e61e3f1-8f3f-4a2b-99db-0d5deff2db38';

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
    const upload: jest.MockedFunction<IFileStorage['upload']> = jest.fn(() =>
      Promise.resolve(),
    );
    const getSignedUrl: jest.MockedFunction<IFileStorage['getSignedUrl']> =
      jest.fn(() => Promise.resolve('file:///tmp/document'));
    const detect: jest.MockedFunction<FileTypeDetector['detect']> = jest.fn(
      () =>
        Promise.resolve({
          ext: 'pdf',
          mime: 'application/pdf',
        }),
    );
    const documentRepository: DocumentRepository = {
      createPending,
    };
    const fileStorage: IFileStorage = {
      upload,
      getSignedUrl,
    };
    const fileTypeDetector: FileTypeDetector = {
      detect,
    };
    const useCase = new UploadDocumentUseCase(
      documentRepository,
      fileStorage,
      fileTypeDetector,
      fileSizeLimitBytes,
      () => storageKey,
    );

    return { createPending, detect, upload, useCase };
  }

  it('stores a valid PDF with a UUID storage key and creates a PENDING document', async () => {
    const { createPending, upload, useCase } = createUseCase();

    await expect(
      useCase.execute({
        userId: 'user-1',
        originalName: 'invoice.pdf',
        buffer: validPdfBuffer,
        sizeBytes: validPdfBuffer.length,
      }),
    ).resolves.toEqual({
      id: 'document-1',
      status: 'PENDING',
      originalName: 'invoice.pdf',
      mimeType: 'application/pdf',
      sizeBytes: validPdfBuffer.length,
    });

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
