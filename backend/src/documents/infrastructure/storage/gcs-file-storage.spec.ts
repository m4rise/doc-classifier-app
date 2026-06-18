import { GcsFileStorage } from './gcs-file-storage';

describe('GcsFileStorage', () => {
  const storageKey = '8e61e3f1-8f3f-4a2b-99db-0d5deff2db38';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createStorage() {
    const save = jest.fn(() => Promise.resolve());
    const getSignedUrl = jest.fn(() => Promise.resolve(['https://signed-url']));
    const file = {
      getSignedUrl,
      save,
    };
    const bucket = {
      file: jest.fn(() => file),
    };
    const storage = {
      bucket: jest.fn(() => bucket),
    };
    const fileStorage = new GcsFileStorage(
      {
        bucketName: 'doc-classifier-documents',
        projectId: 'doc-classifier-app',
      },
      storage,
    );

    return { bucket, fileStorage, getSignedUrl, save, storage };
  }

  it('uploads objects with content type, CRC validation and no-overwrite precondition', async () => {
    const { bucket, fileStorage, save, storage } = createStorage();
    const buffer = Buffer.from('%PDF-1.4', 'utf8');

    await fileStorage.upload(storageKey, buffer, 'application/pdf');

    expect(storage.bucket).toHaveBeenCalledWith('doc-classifier-documents');
    expect(bucket.file).toHaveBeenCalledWith(storageKey);
    expect(save).toHaveBeenCalledWith(buffer, {
      contentType: 'application/pdf',
      metadata: {
        contentType: 'application/pdf',
      },
      preconditionOpts: {
        ifGenerationMatch: 0,
      },
      resumable: false,
      validation: 'crc32c',
    });
  });

  it('creates bounded V4 read signed URLs', async () => {
    const { fileStorage, getSignedUrl } = createStorage();
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    await expect(fileStorage.getSignedUrl(storageKey, 60)).resolves.toBe(
      'https://signed-url',
    );

    expect(getSignedUrl).toHaveBeenCalledWith({
      action: 'read',
      expires: 1_700_000_060_000,
      version: 'v4',
    });
  });

  it('rejects invalid object keys before calling GCS', async () => {
    const { fileStorage, save } = createStorage();

    await expect(
      fileStorage.upload('../invoice.pdf', Buffer.from('x'), 'application/pdf'),
    ).rejects.toThrow('Invalid storage key');

    expect(save).not.toHaveBeenCalled();
  });

  it('rejects signed URL TTLs outside the supported range', async () => {
    const { fileStorage, getSignedUrl } = createStorage();

    await expect(fileStorage.getSignedUrl(storageKey, 0)).rejects.toThrow(
      'Signed URL TTL must be between 1 second and 7 days',
    );

    expect(getSignedUrl).not.toHaveBeenCalled();
  });
});
