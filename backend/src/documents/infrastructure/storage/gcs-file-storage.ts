import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { IFileStorage } from '../../../shared/interfaces/IFileStorage';
import type { GcsFileStorageConfig } from '../config/file-storage.config';
import { resolveGcsFileStorageConfig } from '../config/file-storage.config';
import { assertValidDocumentStorageKey } from './document-storage-key';

interface GcsStorageClient {
  bucket(name: string): GcsBucket;
}

interface GcsBucket {
  file(name: string): GcsFile;
}

interface GcsFile {
  save(buffer: Buffer, options: GcsSaveOptions): Promise<unknown>;
  download(): Promise<[Buffer]>;
  getSignedUrl(options: GcsSignedUrlOptions): Promise<[string]>;
}

interface GcsSaveOptions {
  contentType: string;
  metadata: {
    contentType: string;
  };
  preconditionOpts: {
    ifGenerationMatch: number;
  };
  resumable: false;
  validation: 'crc32c';
}

interface GcsSignedUrlOptions {
  action: 'read';
  expires: number;
  version: 'v4';
}

const MAX_SIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60;

@Injectable()
export class GcsFileStorage implements IFileStorage {
  private readonly bucketName: string;
  private readonly storage: GcsStorageClient;

  constructor(
    config: GcsFileStorageConfig = resolveGcsFileStorageConfig(),
    storage: GcsStorageClient = new Storage({ projectId: config.projectId }),
  ) {
    this.bucketName = config.bucketName;
    this.storage = storage;
  }

  async upload(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    assertValidDocumentStorageKey(key);

    await this.storage
      .bucket(this.bucketName)
      .file(key)
      .save(buffer, {
        contentType: mimeType,
        metadata: {
          contentType: mimeType,
        },
        preconditionOpts: {
          ifGenerationMatch: 0,
        },
        resumable: false,
        validation: 'crc32c',
      });
  }

  async download(key: string): Promise<Buffer> {
    assertValidDocumentStorageKey(key);
    const [buffer] = await this.storage
      .bucket(this.bucketName)
      .file(key)
      .download();

    return buffer;
  }

  async getSignedUrl(key: string, ttlSeconds: number): Promise<string> {
    assertValidDocumentStorageKey(key);
    const expires = Date.now() + validateSignedUrlTtl(ttlSeconds) * 1000;
    const [url] = await this.storage
      .bucket(this.bucketName)
      .file(key)
      .getSignedUrl({
        action: 'read',
        expires,
        version: 'v4',
      });

    return url;
  }
}

function validateSignedUrlTtl(ttlSeconds: number): number {
  if (
    !Number.isSafeInteger(ttlSeconds) ||
    ttlSeconds <= 0 ||
    ttlSeconds > MAX_SIGNED_URL_TTL_SECONDS
  ) {
    throw new Error('Signed URL TTL must be between 1 second and 7 days');
  }

  return ttlSeconds;
}
