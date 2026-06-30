import type {
  GenerateContentResult,
  Part,
  SingleRequestOptions,
} from '@google/generative-ai';

export interface GeminiContentGenerator {
  generateContent(
    request: Array<string | Part>,
    requestOptions?: SingleRequestOptions,
  ): Promise<GenerateContentResult>;
}
