import { Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'fs/promises';
import { resolve, sep } from 'path';
import { pathToFileURL } from 'url';
import { IFileStorage } from '../../../shared/interfaces/IFileStorage';

@Injectable()
export class LocalFileStorage implements IFileStorage {
  private readonly uploadDirectory: string;

  constructor() {
    const configuredUploadDirectory = process.env.LOCAL_UPLOAD_DIR?.trim();
    this.uploadDirectory = resolve(
      configuredUploadDirectory && configuredUploadDirectory.length > 0
        ? configuredUploadDirectory
        : resolve(process.cwd(), 'uploads'),
    );
  }

  async upload(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    void mimeType;
    const filePath = this.resolveStoragePath(key);

    await mkdir(this.uploadDirectory, { recursive: true });
    await writeFile(filePath, buffer, { flag: 'wx' });
  }

  getSignedUrl(key: string, ttlSeconds: number): Promise<string> {
    void ttlSeconds;
    return Promise.resolve(
      pathToFileURL(this.resolveStoragePath(key)).toString(),
    );
  }

  private resolveStoragePath(key: string): string {
    if (key.length === 0 || key.includes('/') || key.includes('\\')) {
      throw new Error('Invalid storage key');
    }

    const filePath = resolve(this.uploadDirectory, key);

    if (!filePath.startsWith(`${this.uploadDirectory}${sep}`)) {
      throw new Error('Invalid storage key');
    }

    return filePath;
  }
}
