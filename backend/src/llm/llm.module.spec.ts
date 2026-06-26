import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { loadAppConfig, validateEnvironment } from '../config/app.config';
import { DOCUMENT_ANALYZER } from '../documents/application/documents.tokens';
import { GeminiDocumentAnalyzer } from './infrastructure/gemini/gemini-document-analyzer';
import { LlmModule } from './llm.module';

describe('LlmModule', () => {
  it('wires Gemini as the current DocumentAnalyzer adapter', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [loadAppConfig],
          validate: validateEnvironment,
        }),
        LlmModule,
      ],
    }).compile();

    expect(moduleRef.get(DOCUMENT_ANALYZER)).toBeInstanceOf(
      GeminiDocumentAnalyzer,
    );

    await moduleRef.close();
  });
});
