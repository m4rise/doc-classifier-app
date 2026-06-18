import {
  resolveFileStorageDriver,
  resolveGcsFileStorageConfig,
} from './file-storage.config';

describe('file storage config', () => {
  const originalEnv = {
    FILE_STORAGE_DRIVER: process.env.FILE_STORAGE_DRIVER,
    GCS_BUCKET_NAME: process.env.GCS_BUCKET_NAME,
    GCS_PROJECT_ID: process.env.GCS_PROJECT_ID,
  };

  afterEach(() => {
    restoreEnv('FILE_STORAGE_DRIVER', originalEnv.FILE_STORAGE_DRIVER);
    restoreEnv('GCS_BUCKET_NAME', originalEnv.GCS_BUCKET_NAME);
    restoreEnv('GCS_PROJECT_ID', originalEnv.GCS_PROJECT_ID);
  });

  it('defaults to local storage when FILE_STORAGE_DRIVER is absent', () => {
    delete process.env.FILE_STORAGE_DRIVER;

    expect(resolveFileStorageDriver()).toBe('local');
  });

  it('accepts local and gcs storage drivers case-insensitively', () => {
    process.env.FILE_STORAGE_DRIVER = ' GCS ';
    expect(resolveFileStorageDriver()).toBe('gcs');

    process.env.FILE_STORAGE_DRIVER = 'LOCAL';
    expect(resolveFileStorageDriver()).toBe('local');
  });

  it('rejects unknown storage drivers during module bootstrap', () => {
    process.env.FILE_STORAGE_DRIVER = 's3';

    expect(() => resolveFileStorageDriver()).toThrow(
      'FILE_STORAGE_DRIVER must be one of: local, gcs',
    );
  });

  it('loads required GCS runtime config', () => {
    process.env.GCS_BUCKET_NAME = 'doc-classifier-documents';
    process.env.GCS_PROJECT_ID = 'doc-classifier-app';

    expect(resolveGcsFileStorageConfig()).toEqual({
      bucketName: 'doc-classifier-documents',
      projectId: 'doc-classifier-app',
    });
  });

  it('fails fast when required GCS runtime config is missing', () => {
    process.env.GCS_BUCKET_NAME = '';
    process.env.GCS_PROJECT_ID = 'doc-classifier-app';

    expect(() => resolveGcsFileStorageConfig()).toThrow(
      'GCS_BUCKET_NAME is required when FILE_STORAGE_DRIVER=gcs',
    );
  });
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
