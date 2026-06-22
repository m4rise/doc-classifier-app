import { Module } from '@nestjs/common';
import { LLM_PROVIDER } from './application/ai.tokens';
import { ClassifyDocumentUseCase } from './application/use-cases/classify-document.use-case';
import { ILlmProvider } from './domain/ILlmProvider';
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
    {
      provide: ClassifyDocumentUseCase,
      useFactory: (llmProvider: ILlmProvider) =>
        new ClassifyDocumentUseCase(llmProvider),
      inject: [LLM_PROVIDER],
    },
  ],
  exports: [LLM_PROVIDER, ClassifyDocumentUseCase],
})
export class AiModule {}
