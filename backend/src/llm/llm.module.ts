import { Module } from '@nestjs/common';
import { DOCUMENT_ANALYZER } from '../documents/application/documents.tokens';
import { GeminiDocumentAnalyzer } from './infrastructure/gemini/gemini-document-analyzer';

@Module({
  providers: [
    {
      provide: GeminiDocumentAnalyzer,
      useFactory: () => new GeminiDocumentAnalyzer(),
    },
    {
      provide: DOCUMENT_ANALYZER,
      useExisting: GeminiDocumentAnalyzer,
    },
  ],
  exports: [DOCUMENT_ANALYZER],
})
export class LlmModule {}
