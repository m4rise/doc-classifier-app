export interface LlmDocumentInput {
  fileBuffer: Buffer;
  mimeType: string;
}

export interface LlmAnalysisResult {
  extractedText: string;
  classification: string;
  summary: string;
  confidenceScore: number;
  language: string;
}

export interface ILlmProvider {
  analyzeDocument(input: LlmDocumentInput): Promise<LlmAnalysisResult>;
}
