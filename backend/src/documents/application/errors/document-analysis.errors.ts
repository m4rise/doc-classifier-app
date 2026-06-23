export class DocumentAnalysisTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Document analysis timed out after ${timeoutMs}ms`);
    this.name = 'DocumentAnalysisTimeoutError';
  }
}

export class InvalidDocumentAnalysisError extends Error {
  constructor(cause?: unknown) {
    super('Document analysis response failed schema validation', { cause });
    this.name = 'InvalidDocumentAnalysisError';
  }
}
