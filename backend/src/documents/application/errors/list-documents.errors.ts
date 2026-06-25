export class InvalidDocumentCursorError extends Error {
  constructor() {
    super('Invalid document cursor');
    this.name = 'InvalidDocumentCursorError';
  }
}
