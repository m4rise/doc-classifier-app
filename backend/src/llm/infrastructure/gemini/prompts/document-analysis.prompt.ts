export const DOCUMENT_ANALYSIS_PROMPT = `
Analyze the document and return only valid JSON with this exact shape:
{
  "extractedText": "Full extracted text from the document.",
  "classification": "Short business classification label.",
  "summary": "Concise summary of the document.",
  "confidenceScore": 0.0,
  "language": "ISO 639-1 language code."
}

The confidenceScore must be a number between 0 and 1.
Do not include Markdown, comments, or additional fields.
`.trim();
