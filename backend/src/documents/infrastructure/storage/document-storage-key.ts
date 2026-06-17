const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertValidDocumentStorageKey(key: string): void {
  if (!UUID_PATTERN.test(key)) {
    throw new Error('Invalid storage key');
  }
}
