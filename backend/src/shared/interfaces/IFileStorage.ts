export interface IFileStorage {
  upload(key: string, buffer: Buffer, mimeType: string): Promise<void>;
  getSignedUrl(key: string, ttlSeconds: number): Promise<string>;
}
