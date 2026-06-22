import {
  GenerateContentResult,
  GenerativeModel,
  GoogleGenerativeAI,
  Part,
  SingleRequestOptions,
} from '@google/generative-ai';
import { ZodError } from 'zod';
import {
  ILlmProvider,
  LlmAnalysisResult,
  LlmDocumentInput,
} from '../domain/ILlmProvider';
import {
  LlmSchemaValidationError,
  LlmTimeoutError,
} from '../domain/errors/llm.errors';
import {
  resolveGeminiApiKey,
  resolveGeminiModel,
  resolveGeminiTimeoutMs,
} from './config/gemini.config';
import { DOCUMENT_ANALYSIS_PROMPT } from './prompts/document-analysis.prompt';
import { GeminiAnalysisSchema } from './schemas/gemini-analysis.schema';

export interface GeminiContentGenerator {
  generateContent(
    request: Array<string | Part>,
    requestOptions?: SingleRequestOptions,
  ): Promise<GenerateContentResult>;
}

interface GeminiLlmProviderOptions {
  apiKey?: string;
  model?: GeminiContentGenerator;
  modelName?: string;
  timeoutMs?: number;
}

export class GeminiLlmProvider implements ILlmProvider {
  private readonly apiKey?: string;
  private readonly modelName: string;
  private readonly timeoutMs: number;
  private readonly injectedModel?: GeminiContentGenerator;
  private cachedModel?: GeminiContentGenerator;

  constructor(options: GeminiLlmProviderOptions = {}) {
    this.apiKey = options.apiKey ?? resolveGeminiApiKey();
    this.modelName = options.modelName ?? resolveGeminiModel();
    this.timeoutMs = options.timeoutMs ?? resolveGeminiTimeoutMs();
    this.injectedModel = options.model;
  }

  async analyzeDocument(input: LlmDocumentInput): Promise<LlmAnalysisResult> {
    const result = await this.generateContentWithTimeout(input);
    const responseText = result.response.text();
    return this.parseResponse(responseText);
  }

  private generateContentWithTimeout(
    input: LlmDocumentInput,
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
        reject(new LlmTimeoutError(this.timeoutMs));
      }, this.timeoutMs);
    });

    return Promise.race([operation, timeout])
      .catch((error: unknown) => {
        if (error instanceof LlmTimeoutError) {
          throw error;
        }

        if (abortController.signal.aborted) {
          throw new LlmTimeoutError(this.timeoutMs);
        }

        throw error;
      })
      .finally(() => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      });
  }

  private createRequest(input: LlmDocumentInput): Array<string | Part> {
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
      throw new Error('GEMINI_API_KEY is required for GeminiLlmProvider');
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

  private parseResponse(responseText: string): LlmAnalysisResult {
    try {
      const parsedResponse = JSON.parse(responseText) as unknown;
      return GeminiAnalysisSchema.parse(parsedResponse);
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof ZodError) {
        throw new LlmSchemaValidationError(error);
      }

      throw error;
    }
  }
}
