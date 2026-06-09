export abstract class RefreshTokenHasher {
  abstract hash(plainToken: string): Promise<string>;
  abstract verify(hash: string, plainToken: string): Promise<boolean>;
}
