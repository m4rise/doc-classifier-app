import { Injectable } from '@nestjs/common';
import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { resolve, sep } from 'path';
import { pathToFileURL } from 'url';
import { FileStorage } from '../../application/ports/file-storage.port';
import { assertValidDocumentStorageKey } from './document-storage-key';

@Injectable()
export class LocalFileStorage implements FileStorage {
  private readonly uploadDirectory: string;

  constructor(configuredUploadDirectory?: string) {
    this.uploadDirectory = resolve(
      configuredUploadDirectory && configuredUploadDirectory.length > 0
        ? configuredUploadDirectory
        : resolve(process.cwd(), 'uploads'),
    );
  }

  async upload(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    void mimeType;
    assertValidDocumentStorageKey(key);
    const filePath = this.resolveStoragePath(key);

    await mkdir(this.uploadDirectory, { recursive: true });
    await writeFile(filePath, buffer, { flag: 'wx' });
  }

  async download(key: string): Promise<Buffer> {
    assertValidDocumentStorageKey(key);
    return readFile(this.resolveStoragePath(key));
  }

  async delete(key: string): Promise<void> {
    assertValidDocumentStorageKey(key);
    await rm(this.resolveStoragePath(key), { force: true });
  }

  getSignedUrl(key: string, ttlSeconds: number): Promise<string> {
    void ttlSeconds;
    assertValidDocumentStorageKey(key);
    return Promise.resolve(
      pathToFileURL(this.resolveStoragePath(key)).toString(),
    );
  }

  private resolveStoragePath(key: string): string {
    const filePath = resolve(this.uploadDirectory, key);

    if (!filePath.startsWith(`${this.uploadDirectory}${sep}`)) {
      throw new Error('Invalid storage key');
    }

    return filePath;
  }
}
