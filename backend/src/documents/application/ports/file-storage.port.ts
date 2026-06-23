export interface FileStorage {
  upload(key: string, buffer: Buffer, mimeType: string): Promise<void>;
  download(key: string): Promise<Buffer>;
  getSignedUrl(key: string, ttlSeconds: number): Promise<string>;
}
