import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ILlmProvider, LlmAnalysisResult } from '../../domain/ILlmProvider';
import { ClassifyDocumentUseCase } from './classify-document.use-case';

describe('ClassifyDocumentUseCase', () => {
  it('delegates document analysis to an injected ILlmProvider', async () => {
    const analysis: LlmAnalysisResult = {
      extractedText: 'Invoice #2026-001',
      classification: 'invoice',
      summary: 'Invoice for professional services.',
      confidenceScore: 0.94,
      language: 'en',
    };
    const analyzeDocument: jest.MockedFunction<
      ILlmProvider['analyzeDocument']
    > = jest.fn(() => Promise.resolve(analysis));
    const llmProvider: ILlmProvider = { analyzeDocument };
    const useCase = new ClassifyDocumentUseCase(llmProvider);
    const input = {
      fileBuffer: Buffer.from('%PDF-1.4\n%%EOF', 'utf8'),
      mimeType: 'application/pdf',
    };

    await expect(useCase.execute(input)).resolves.toEqual(analysis);

    expect(analyzeDocument).toHaveBeenCalledWith(input);
  });

  it('does not import Gemini or Google SDKs', () => {
    const source = readFileSync(
      join(
        process.cwd(),
        'src',
        'ai',
        'application',
        'use-cases',
        'classify-document.use-case.ts',
      ),
      'utf8',
    );

    expect(source).not.toMatch(/@google(?:-ai|-cloud|\/generative-ai)/);
    expect(source).not.toContain('Gemini');
  });
});
