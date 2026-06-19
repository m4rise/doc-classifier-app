export class LlmTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`LLM analysis timed out after ${timeoutMs}ms`);
    this.name = 'LlmTimeoutError';
  }
}

export class LlmSchemaValidationError extends Error {
  constructor(cause?: unknown) {
    super('LLM response failed schema validation', { cause });
    this.name = 'LlmSchemaValidationError';
  }
}
