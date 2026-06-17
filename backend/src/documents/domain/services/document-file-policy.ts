import { InvalidFileTypeError } from '../errors/upload-document.errors';

export interface DetectedDocumentFileType {
  ext: string;
  mime: string;
}

export interface ValidatedDocumentFileType {
  mimeType: string;
}

interface SupportedFileType {
  mimeType: string;
  detectedExtensions: readonly string[];
  filenameExtensions: readonly string[];
}

const SUPPORTED_FILE_TYPES: readonly SupportedFileType[] = [
  {
    mimeType: 'application/pdf',
    detectedExtensions: ['pdf'],
    filenameExtensions: ['pdf'],
  },
  {
    mimeType: 'image/jpeg',
    detectedExtensions: ['jpg'],
    filenameExtensions: ['jpg', 'jpeg'],
  },
  {
    mimeType: 'image/png',
    detectedExtensions: ['png'],
    filenameExtensions: ['png'],
  },
  {
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    detectedExtensions: ['docx'],
    filenameExtensions: ['docx'],
  },
];

export function validateDocumentFileType(
  originalName: string,
  detectedFileType: DetectedDocumentFileType | null,
): ValidatedDocumentFileType {
  if (!detectedFileType) {
    throw new InvalidFileTypeError();
  }

  const originalExtension = extractLowerExtension(originalName);
  const detectedExtension = detectedFileType.ext.toLowerCase();
  const detectedMimeType = detectedFileType.mime.toLowerCase();

  const supportedFileType = SUPPORTED_FILE_TYPES.find(
    (fileType) =>
      fileType.mimeType === detectedMimeType &&
      fileType.detectedExtensions.includes(detectedExtension) &&
      fileType.filenameExtensions.includes(originalExtension),
  );

  if (!supportedFileType) {
    throw new InvalidFileTypeError();
  }

  return { mimeType: supportedFileType.mimeType };
}

function extractLowerExtension(originalName: string): string {
  const normalizedName = originalName.trim().toLowerCase();
  const extensionIndex = normalizedName.lastIndexOf('.');

  if (extensionIndex < 0 || extensionIndex === normalizedName.length - 1) {
    return '';
  }

  return normalizedName.slice(extensionIndex + 1);
}
