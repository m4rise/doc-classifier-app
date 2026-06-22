// Compatibility export for Story 3.4 consumers. The canonical errors live in
// shared because the documents application slice handles provider failures.
export {
  LlmSchemaValidationError,
  LlmTimeoutError,
} from '../../../shared/errors/llm.errors';
