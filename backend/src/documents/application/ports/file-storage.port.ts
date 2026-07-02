export interface FileStorage {
  upload(key: string, buffer: Buffer, mimeType: string): Promise<void>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, ttlSeconds: number): Promise<string>;
}
