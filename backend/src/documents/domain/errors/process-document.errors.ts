export class DocumentNotPendingError extends Error {
  constructor(documentId: string) {
    super(`Document ${documentId} is not available for processing`);
    this.name = 'DocumentNotPendingError';
  }
}

export class DocumentNotFoundError extends Error {
  constructor(documentId: string) {
    super(`Document ${documentId} not found`);
    this.name = 'DocumentNotFoundError';
  }
}
