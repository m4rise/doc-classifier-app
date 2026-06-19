import { GeminiLlmProvider } from './gemini-llm.provider';

const shouldRunRealGeminiTest =
  process.env.RUN_GEMINI_INTEGRATION === 'true' && process.env.GEMINI_API_KEY;
const describeIfGeminiKey = shouldRunRealGeminiTest ? describe : describe.skip;

describeIfGeminiKey('GeminiLlmProvider integration', () => {
  it('returns a schema-valid result for a valid PDF buffer', async () => {
    const provider = new GeminiLlmProvider();

    const result = await provider.analyzeDocument({
      fileBuffer: createMinimalPdfBuffer(),
      mimeType: 'application/pdf',
    });

    expect(typeof result.extractedText).toBe('string');
    expect(typeof result.classification).toBe('string');
    expect(typeof result.summary).toBe('string');
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(result.confidenceScore).toBeLessThanOrEqual(1);
    expect(typeof result.language).toBe('string');
  }, 30_000);
});

function createMinimalPdfBuffer(): Buffer {
  const streamContent =
    'BT\n/F1 18 Tf\n72 720 Td\n(Invoice 2026-001 total 120 EUR) Tj\nET\n';
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(
      streamContent,
      'utf8',
    )} >>\nstream\n${streamContent}endstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = objects.map((object) => {
    const offset = Buffer.byteLength(pdf, 'utf8');
    pdf += object;
    return offset;
  });
  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  const xrefEntries = offsets
    .map((offset) => `${offset.toString().padStart(10, '0')} 00000 n \n`)
    .join('');

  pdf += `xref\n0 6\n0000000000 65535 f \n${xrefEntries}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}
