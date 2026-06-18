import { z } from 'zod';
import { LlmAnalysisResult } from '../../domain/ILlmProvider';

export const GeminiAnalysisSchema: z.ZodType<LlmAnalysisResult> = z
  .object({
    extractedText: z.string(),
    classification: z.string(),
    summary: z.string(),
    confidenceScore: z.number().min(0).max(1),
    language: z.string(),
  })
  .strict();
