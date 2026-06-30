import {
  GenerateContentResult,
  GenerativeModel,
  GoogleGenerativeAI,
  Part,
} from '@google/generative-ai';
import { ZodError } from 'zod';
import {
  DocumentAnalysisInput,
  DocumentAnalysisResult,
  DocumentAnalyzer,
} from '../../../documents/application/ports/document-analyzer.port';
import {
  DocumentAnalysisTimeoutError,
  InvalidDocumentAnalysisError,
} from '../../../documents/application/errors/document-analysis.errors';
import { DOCUMENT_ANALYSIS_PROMPT } from './prompts/document-analysis.prompt';
import { GeminiAnalysisSchema } from './schemas/gemini-analysis.schema';
import type { GeminiContentGenerator } from './gemini-document-analyzer.types';

interface GeminiDocumentAnalyzerOptions {
  apiKey?: string;
  model?: GeminiContentGenerator;
  modelName: string;
  timeoutMs: number;
}

export class GeminiDocumentAnalyzer implements DocumentAnalyzer {
  private readonly apiKey?: string;
  private readonly modelName: string;
  private readonly timeoutMs: number;
  private readonly injectedModel?: GeminiContentGenerator;
  private cachedModel?: GeminiContentGenerator;

  constructor(options: GeminiDocumentAnalyzerOptions) {
    this.apiKey = options.apiKey;
    this.modelName = options.modelName;
    this.timeoutMs = options.timeoutMs;
    this.injectedModel = options.model;
  }

  async analyze(input: DocumentAnalysisInput): Promise<DocumentAnalysisResult> {
    const result = await this.generateContentWithTimeout(input);
    const responseText = result.response.text();
    return this.parseResponse(responseText);
  }

  private generateContentWithTimeout(
    input: DocumentAnalysisInput,
  ): Promise<GenerateContentResult> {
    const abortController = new AbortController();
    const request = this.createRequest(input);
    const operation = this.getModel().generateContent(request, {
      signal: abortController.signal,
    });

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        abortController.abort();
        reject(new DocumentAnalysisTimeoutError(this.timeoutMs));
      }, this.timeoutMs);
    });

    return Promise.race([operation, timeout])
      .catch((error: unknown) => {
        if (error instanceof DocumentAnalysisTimeoutError) {
          throw error;
        }

        if (abortController.signal.aborted) {
          throw new DocumentAnalysisTimeoutError(this.timeoutMs);
        }

        throw error;
      })
      .finally(() => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      });
  }

  private createRequest(input: DocumentAnalysisInput): Array<string | Part> {
    return [
      DOCUMENT_ANALYSIS_PROMPT,
      {
        inlineData: {
          data: input.fileBuffer.toString('base64'),
          mimeType: input.mimeType,
        },
      },
    ];
  }

  private getModel(): GeminiContentGenerator {
    if (this.injectedModel) {
      return this.injectedModel;
    }

    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is required for GeminiDocumentAnalyzer');
    }

    if (!this.cachedModel) {
      const client = new GoogleGenerativeAI(this.apiKey);
      this.cachedModel = client.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }) satisfies Pick<GenerativeModel, 'generateContent'>;
    }

    return this.cachedModel;
  }

  private parseResponse(responseText: string): DocumentAnalysisResult {
    try {
      const parsedResponse = JSON.parse(responseText) as unknown;
      return GeminiAnalysisSchema.parse(parsedResponse);
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof ZodError) {
        throw new InvalidDocumentAnalysisError(error);
      }

      throw error;
    }
  }
}
