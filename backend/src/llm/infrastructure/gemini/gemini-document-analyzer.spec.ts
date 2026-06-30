import { GenerateContentResult } from '@google/generative-ai';
import {
  DocumentAnalysisTimeoutError,
  InvalidDocumentAnalysisError,
} from '../../../documents/application/errors/document-analysis.errors';
import { GeminiDocumentAnalyzer } from './gemini-document-analyzer';
import type { GeminiContentGenerator } from './gemini-document-analyzer.types';
import { DOCUMENT_ANALYSIS_PROMPT } from './prompts/document-analysis.prompt';

describe('GeminiDocumentAnalyzer', () => {
  const input = {
    fileBuffer: Buffer.from('%PDF-1.4\n%%EOF', 'utf8'),
    mimeType: 'application/pdf',
  };

  const analysis = {
    extractedText: 'Invoice #2026-001',
    classification: 'invoice',
    summary: 'Invoice for professional services.',
    confidenceScore: 0.94,
    language: 'en',
  };

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sends the document prompt and inline PDF data to Gemini, then returns schema-valid output', async () => {
    const generateContent = mockGenerateContent(() =>
      Promise.resolve(createGeminiResult(JSON.stringify(analysis))),
    );
    const provider = createProvider(generateContent);

    await expect(provider.analyze(input)).resolves.toEqual(analysis);

    expect(generateContent).toHaveBeenCalledTimes(1);
    const [request, requestOptions] = generateContent.mock.calls[0];
    expect(request).toEqual([
      DOCUMENT_ANALYSIS_PROMPT,
      {
        inlineData: {
          data: input.fileBuffer.toString('base64'),
          mimeType: 'application/pdf',
        },
      },
    ]);
    expectSignalAborted(requestOptions, false);
  });

  it('throws DocumentAnalysisTimeoutError and aborts the Gemini call when the timeout fires', async () => {
    jest.useFakeTimers();
    const generateContent = mockGenerateContent(
      () => new Promise<GenerateContentResult>(() => undefined),
    );
    const provider = createProvider(generateContent, 10);

    const result = expect(provider.analyze(input)).rejects.toBeInstanceOf(
      DocumentAnalysisTimeoutError,
    );
    await jest.advanceTimersByTimeAsync(10);

    await result;
    const [, requestOptions] = generateContent.mock.calls[0];
    expectSignalAborted(requestOptions, true);
  });

  it('throws InvalidDocumentAnalysisError when Gemini returns malformed JSON', async () => {
    const generateContent = mockGenerateContent(() =>
      Promise.resolve(createGeminiResult('not-json')),
    );
    const provider = createProvider(generateContent);

    await expect(provider.analyze(input)).rejects.toBeInstanceOf(
      InvalidDocumentAnalysisError,
    );
  });

  it('throws InvalidDocumentAnalysisError when Gemini returns JSON outside the expected schema', async () => {
    const generateContent = mockGenerateContent(() =>
      Promise.resolve(
        createGeminiResult(JSON.stringify({ extractedText: '' })),
      ),
    );
    const provider = createProvider(generateContent);

    await expect(provider.analyze(input)).rejects.toBeInstanceOf(
      InvalidDocumentAnalysisError,
    );
  });
});

function createProvider(
  generateContent: GeminiContentGenerator['generateContent'],
  timeoutMs = 100,
): GeminiDocumentAnalyzer {
  return new GeminiDocumentAnalyzer({
    model: { generateContent },
    modelName: 'gemini-3.5-flash',
    timeoutMs,
  });
}

function createGeminiResult(text: string): GenerateContentResult {
  return {
    response: {
      text: () => text,
    },
  } as GenerateContentResult;
}

function mockGenerateContent(
  implementation: GeminiContentGenerator['generateContent'],
): jest.MockedFunction<GeminiContentGenerator['generateContent']> {
  return jest.fn(implementation);
}

function expectSignalAborted(
  requestOptions: Parameters<GeminiContentGenerator['generateContent']>[1],
  expected: boolean,
): void {
  const signal = requestOptions?.signal;

  expect(signal).toBeDefined();
  expect(signal?.aborted).toBe(expected);
}
