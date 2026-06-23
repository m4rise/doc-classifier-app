import { z } from 'zod';
import { DocumentAnalysisResult } from '../../../../documents/application/ports/document-analyzer.port';

export const GeminiAnalysisSchema: z.ZodType<DocumentAnalysisResult> = z
  .object({
    extractedText: z.string(),
    classification: z.string(),
    summary: z.string(),
    confidenceScore: z.number().min(0).max(1),
    language: z.string(),
  })
  .strict();
