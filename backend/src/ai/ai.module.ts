import { Module } from '@nestjs/common';
import { LLM_PROVIDER } from './application/ai.tokens';
import { GeminiLlmProvider } from './infrastructure/gemini-llm.provider';

@Module({
  providers: [
    {
      provide: GeminiLlmProvider,
      useFactory: () => new GeminiLlmProvider(),
    },
    {
      provide: LLM_PROVIDER,
      useExisting: GeminiLlmProvider,
    },
  ],
  exports: [LLM_PROVIDER],
})
export class AiModule {}
