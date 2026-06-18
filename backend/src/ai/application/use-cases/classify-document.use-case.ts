import {
  ILlmProvider,
  LlmAnalysisResult,
  LlmDocumentInput,
} from '../../domain/ILlmProvider';

export class ClassifyDocumentUseCase {
  constructor(private readonly llmProvider: ILlmProvider) {}

  execute(input: LlmDocumentInput): Promise<LlmAnalysisResult> {
    return this.llmProvider.analyzeDocument(input);
  }
}
