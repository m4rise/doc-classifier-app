const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeAndValidateEmailAddress(raw: string): string | null {
  const normalized = raw.trim().toLowerCase();

  return EMAIL_ADDRESS_PATTERN.test(normalized) ? normalized : null;
}
