import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfiguration } from '../config/app.config';
import { DOCUMENT_ANALYZER } from '../documents/application/documents.tokens';
import { GeminiDocumentAnalyzer } from './infrastructure/gemini/gemini-document-analyzer';

@Module({
  providers: [
    {
      provide: GeminiDocumentAnalyzer,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfiguration, true>) => {
        const gemini = configService.getOrThrow('llm', {
          infer: true,
        }).gemini;

        return new GeminiDocumentAnalyzer({
          apiKey: gemini.apiKey,
          modelName: gemini.model,
          timeoutMs: gemini.timeoutMs,
        });
      },
    },
    {
      provide: DOCUMENT_ANALYZER,
      useExisting: GeminiDocumentAnalyzer,
    },
  ],
  exports: [DOCUMENT_ANALYZER],
})
export class LlmModule {}
