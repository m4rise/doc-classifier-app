import { isUuid } from '../../domain/validation/uuid';

export function assertValidDocumentStorageKey(key: string): void {
  if (!isUuid(key)) {
    throw new Error('Invalid storage key');
  }
}
