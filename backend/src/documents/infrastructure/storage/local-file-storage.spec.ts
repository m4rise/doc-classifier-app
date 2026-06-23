import { rm } from 'fs/promises';
import { join } from 'path';
import { LocalFileStorage } from './local-file-storage';

describe('LocalFileStorage', () => {
  const originalLocalUploadDir = process.env.LOCAL_UPLOAD_DIR;
  const uploadDir = join(process.cwd(), 'uploads', 'jest-local-file-storage');
  const storageKey = '8e61e3f1-8f3f-4a2b-99db-0d5deff2db38';

  beforeEach(async () => {
    process.env.LOCAL_UPLOAD_DIR = uploadDir;
    await rm(uploadDir, { recursive: true, force: true });
  });

  afterAll(async () => {
    await rm(uploadDir, { recursive: true, force: true });

    if (originalLocalUploadDir === undefined) {
      delete process.env.LOCAL_UPLOAD_DIR;
    } else {
      process.env.LOCAL_UPLOAD_DIR = originalLocalUploadDir;
    }
  });

  it('downloads the same bytes that were uploaded', async () => {
    const storage = new LocalFileStorage();
    const buffer = Buffer.from('%PDF-1.4\n%%EOF', 'utf8');

    await storage.upload(storageKey, buffer, 'application/pdf');

    await expect(storage.download(storageKey)).resolves.toEqual(buffer);
  });

  it('rejects invalid download keys before reading the filesystem', async () => {
    const storage = new LocalFileStorage();

    await expect(storage.download('../invoice.pdf')).rejects.toThrow(
      'Invalid storage key',
    );
  });
});
