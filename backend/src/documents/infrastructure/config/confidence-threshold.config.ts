export const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;

export function resolveConfidenceThreshold(): number {
  const value = process.env.CONFIDENCE_THRESHOLD;

  if (!value) {
    return DEFAULT_CONFIDENCE_THRESHOLD;
  }

  const trimmedValue = value.trim();

  if (!/^(?:0(?:\.\d+)?|1(?:\.0+)?)$/.test(trimmedValue)) {
    return DEFAULT_CONFIDENCE_THRESHOLD;
  }

  const parsed = Number(trimmedValue);
  return parsed >= 0 && parsed <= 1 ? parsed : DEFAULT_CONFIDENCE_THRESHOLD;
}
