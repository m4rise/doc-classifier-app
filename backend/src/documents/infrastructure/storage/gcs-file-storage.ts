import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { FileStorage } from '../../application/ports/file-storage.port';
import { assertValidDocumentStorageKey } from './document-storage-key';

interface GcsFileStorageConfig {
  bucketName: string;
  projectId: string;
}

interface GcsStorageClient {
  bucket(name: string): GcsBucket;
}

interface GcsBucket {
  file(name: string): GcsFile;
}

interface GcsFile {
  save(buffer: Buffer, options: GcsSaveOptions): Promise<unknown>;
  download(): Promise<[Buffer]>;
  delete(options: GcsDeleteOptions): Promise<unknown>;
  getSignedUrl(options: GcsSignedUrlOptions): Promise<[string]>;
}

interface GcsDeleteOptions {
  ignoreNotFound: true;
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

const MAX_SIGNED_URL_TTL_SECONDS = 900;

@Injectable()
export class GcsFileStorage implements FileStorage {
  private readonly bucketName: string;
  private readonly storage: GcsStorageClient;

  constructor(
    config: GcsFileStorageConfig,
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

  async delete(key: string): Promise<void> {
    assertValidDocumentStorageKey(key);
    await this.storage.bucket(this.bucketName).file(key).delete({
      ignoreNotFound: true,
    });
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
    throw new Error('Signed URL TTL must be between 1 and 900 seconds');
  }

  return ttlSeconds;
}
