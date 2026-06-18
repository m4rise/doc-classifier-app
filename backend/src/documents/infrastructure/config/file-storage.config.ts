export type FileStorageDriver = 'local' | 'gcs';

export interface GcsFileStorageConfig {
  bucketName: string;
  projectId: string;
}

export function resolveFileStorageDriver(): FileStorageDriver {
  const value = process.env.FILE_STORAGE_DRIVER?.trim().toLowerCase();

  if (!value) {
    return 'local';
  }

  if (value === 'local' || value === 'gcs') {
    return value;
  }

  throw new Error('FILE_STORAGE_DRIVER must be one of: local, gcs');
}

export function resolveGcsFileStorageConfig(): GcsFileStorageConfig {
  return {
    bucketName: readRequiredEnv('GCS_BUCKET_NAME'),
    projectId: readRequiredEnv('GCS_PROJECT_ID'),
  };
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required when FILE_STORAGE_DRIVER=gcs`);
  }

  return value;
}
