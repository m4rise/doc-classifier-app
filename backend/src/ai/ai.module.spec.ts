import { Test } from '@nestjs/testing';
import { LLM_PROVIDER } from './application/ai.tokens';
import { AiModule } from './ai.module';
import { GeminiLlmProvider } from './infrastructure/gemini-llm.provider';

describe('AiModule', () => {
  it('wires GeminiLlmProvider as the ILlmProvider token', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AiModule],
    }).compile();

    expect(moduleRef.get(LLM_PROVIDER)).toBeInstanceOf(GeminiLlmProvider);

    await moduleRef.close();
  });
});
