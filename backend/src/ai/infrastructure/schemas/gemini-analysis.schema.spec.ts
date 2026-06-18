import { ZodError } from 'zod';
import { GeminiAnalysisSchema } from './gemini-analysis.schema';

describe('GeminiAnalysisSchema', () => {
  const validAnalysis = {
    extractedText: 'Invoice #2026-001\nTotal: 120.00 EUR',
    classification: 'invoice',
    summary: 'Invoice for professional services.',
    confidenceScore: 0.92,
    language: 'en',
  };

  it('accepts a valid Gemini analysis response', () => {
    expect(GeminiAnalysisSchema.parse(validAnalysis)).toEqual(validAnalysis);
  });

  it.each([
    ['missing extractedText', { ...validAnalysis, extractedText: undefined }],
    ['missing classification', { ...validAnalysis, classification: undefined }],
    ['missing summary', { ...validAnalysis, summary: undefined }],
    ['missing language', { ...validAnalysis, language: undefined }],
    ['negative confidenceScore', { ...validAnalysis, confidenceScore: -0.01 }],
    ['confidenceScore above 1', { ...validAnalysis, confidenceScore: 1.01 }],
    [
      'non-numeric confidenceScore',
      { ...validAnalysis, confidenceScore: '0.7' },
    ],
  ])('throws ZodError for %s', (_caseName, response) => {
    expect(() => GeminiAnalysisSchema.parse(response)).toThrow(ZodError);
  });
});
