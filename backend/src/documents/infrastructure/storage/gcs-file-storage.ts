import { Injectable } from '@nestjs/common';
import { IFileStorage } from '../../../shared/interfaces/IFileStorage';

@Injectable()
export class GcsFileStorage implements IFileStorage {
  upload(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    void key;
    void buffer;
    void mimeType;
    return Promise.reject(
      new Error(
        'GcsFileStorage is a staging stub. Connect the Google Cloud Storage SDK before enabling production uploads.',
      ),
    );
  }

  getSignedUrl(key: string, ttlSeconds: number): Promise<string> {
    void key;
    void ttlSeconds;
    return Promise.reject(
      new Error(
        'GcsFileStorage is a staging stub. Connect the Google Cloud Storage SDK before enabling signed URLs.',
      ),
    );
  }
}
