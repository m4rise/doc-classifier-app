const DEFAULT_FILE_SIZE_LIMIT_MB = 10;
const BYTES_PER_MEGABYTE = 1024 * 1024;

export function resolveFileSizeLimitBytes(): number {
  return (
    readPositiveIntegerEnv('FILE_SIZE_LIMIT_MB', DEFAULT_FILE_SIZE_LIMIT_MB) *
    BYTES_PER_MEGABYTE
  );
}

function readPositiveIntegerEnv(name: string, defaultValue: number): number {
  const value = process.env[name];

  if (!value) {
    return defaultValue;
  }

  const trimmedValue = value.trim();

  if (!/^\d+$/.test(trimmedValue)) {
    return defaultValue;
  }

  const parsed = Number(trimmedValue);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : defaultValue;
}
