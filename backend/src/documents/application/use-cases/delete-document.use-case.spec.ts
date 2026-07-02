import { DocumentNotFoundError } from '../../domain/errors/process-document.errors';
import { DocumentRepository } from '../ports/document.repository.port';
import { FileStorage } from '../ports/file-storage.port';
import {
  DeleteDocumentUseCase,
  DocumentDeletionLogger,
} from './delete-document.use-case';

describe('DeleteDocumentUseCase', () => {
  const documentId = '11111111-1111-4111-8111-111111111111';
  const userId = '22222222-2222-4222-8222-222222222222';
  const storageKey = '33333333-3333-4333-8333-333333333333';

  function createHarness() {
    const calls: string[] = [];
    const softDeleteForUser: jest.MockedFunction<
      DocumentRepository['softDeleteForUser']
    > = jest.fn(() => {
      calls.push('softDelete');
      return Promise.resolve({ id: documentId, storageKey });
    });
    const hardDelete: jest.MockedFunction<DocumentRepository['hardDelete']> =
      jest.fn(() => {
        calls.push('hardDelete');
        return Promise.resolve();
      });
    const repository: DocumentRepository = {
      beginProcessing: jest.fn(),
      completeProcessing: jest.fn(),
      createPending: jest.fn(),
      failProcessing: jest.fn(),
      findByIdForUser: jest.fn(),
      hardDelete,
      listForUser: jest.fn(),
      softDeleteForUser,
    };
    const deleteObject: jest.MockedFunction<FileStorage['delete']> = jest.fn(
      () => {
        calls.push('storageDelete');
        return Promise.resolve();
      },
    );
    const fileStorage: FileStorage = {
      delete: deleteObject,
      download: jest.fn(),
      getSignedUrl: jest.fn(),
      upload: jest.fn(),
    };
    const error = jest.fn();
    const logger: DocumentDeletionLogger = { error };

    return {
      calls,
      deleteObject,
      error,
      hardDelete,
      softDeleteForUser,
      useCase: new DeleteDocumentUseCase(repository, fileStorage, logger),
    };
  }

  it('soft-deletes before storage cleanup and hard-deletes after confirmation', async () => {
    const harness = createHarness();

    await expect(
      harness.useCase.execute(documentId, userId),
    ).resolves.toBeUndefined();

    expect(harness.calls).toEqual([
      'softDelete',
      'storageDelete',
      'hardDelete',
    ]);
    expect(harness.softDeleteForUser).toHaveBeenCalledWith(documentId, userId);
    expect(harness.deleteObject).toHaveBeenCalledWith(storageKey);
    expect(harness.hardDelete).toHaveBeenCalledWith(documentId, userId);
    expect(harness.error).not.toHaveBeenCalled();
  });

  it('maps an opaque null repository result to the not-found error', async () => {
    const harness = createHarness();
    harness.softDeleteForUser.mockResolvedValueOnce(null);

    await expect(
      harness.useCase.execute(documentId, userId),
    ).rejects.toBeInstanceOf(DocumentNotFoundError);

    expect(harness.deleteObject).not.toHaveBeenCalled();
    expect(harness.hardDelete).not.toHaveBeenCalled();
  });

  it('keeps the tombstone and logs identifiers when storage deletion fails', async () => {
    const harness = createHarness();
    const storageError = new Error('GCS unavailable');
    harness.deleteObject.mockRejectedValueOnce(storageError);

    await expect(
      harness.useCase.execute(documentId, userId),
    ).resolves.toBeUndefined();

    expect(harness.hardDelete).not.toHaveBeenCalled();
    expect(harness.error).toHaveBeenCalledWith(
      {
        err: storageError,
        documentId,
        storageKey,
      },
      'Document storage deletion failed after database soft-delete',
    );
  });

  it('propagates an unexpected physical database deletion failure', async () => {
    const harness = createHarness();
    const databaseError = new Error('database unavailable');
    harness.hardDelete.mockRejectedValueOnce(databaseError);

    await expect(harness.useCase.execute(documentId, userId)).rejects.toBe(
      databaseError,
    );
    expect(harness.error).not.toHaveBeenCalled();
  });
});
