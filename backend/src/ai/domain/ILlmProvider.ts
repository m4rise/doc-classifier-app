// Compatibility export for the Story 3.3 public contract. The canonical port
// lives in shared because the documents application slice consumes it in Story 3.5.
export type {
  ILlmProvider,
  LlmAnalysisResult,
  LlmDocumentInput,
} from '../../shared/interfaces/ILlmProvider';
