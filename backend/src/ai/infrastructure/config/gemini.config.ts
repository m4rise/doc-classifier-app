export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';
export const DEFAULT_GEMINI_TIMEOUT_MS = 8_000;
const MAX_GEMINI_TIMEOUT_MS = 120_000;

export function resolveGeminiApiKey(): string | undefined {
  const value = process.env.GEMINI_API_KEY?.trim();
  return value && value.length > 0 ? value : undefined;
}

export function resolveGeminiModel(): string {
  const value = process.env.GEMINI_MODEL?.trim();
  return value && value.length > 0 ? value : DEFAULT_GEMINI_MODEL;
}

export function resolveGeminiTimeoutMs(): number {
  return readPositiveIntegerEnv(
    'GEMINI_TIMEOUT_MS',
    DEFAULT_GEMINI_TIMEOUT_MS,
    MAX_GEMINI_TIMEOUT_MS,
  );
}

function readPositiveIntegerEnv(
  name: string,
  defaultValue: number,
  maxValue: number,
): number {
  const value = process.env[name];

  if (!value) {
    return defaultValue;
  }

  const trimmedValue = value.trim();

  if (!/^\d+$/.test(trimmedValue)) {
    return defaultValue;
  }

  const parsed = Number(trimmedValue);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= maxValue
    ? parsed
    : defaultValue;
}
