export interface DocumentAnalysisInput {
  fileBuffer: Buffer;
  mimeType: string;
}

export interface DocumentAnalysisResult {
  extractedText: string;
  classification: string;
  summary: string;
  confidenceScore: number;
  language: string;
}

/**
 * Semantic application port owned by the documents slice.
 *
 * Adapters may use Gemini, vLLM, or another provider, but provider concepts
 * must not leak through this boundary.
 */
export interface DocumentAnalyzer {
  analyze(input: DocumentAnalysisInput): Promise<DocumentAnalysisResult>;
}
