import { Injectable } from '@nestjs/common';
import { createRequire } from 'module';
import { DetectedDocumentFileType } from '../../domain/services/document-file-policy';
import { FileTypeDetector } from '../../application/ports/file-type-detector.port';

interface FileTypePackageModule {
  fileTypeFromBuffer(
    buffer: Buffer,
  ): Promise<DetectedDocumentFileType | undefined>;
}

const requireFileType = createRequire(__filename);

@Injectable()
export class FileTypePackageDetector extends FileTypeDetector {
  async detect(buffer: Buffer): Promise<DetectedDocumentFileType | null> {
    const detectedFileType = await this.detectWithFileTypePackage(buffer);

    if (!detectedFileType) {
      return null;
    }

    return {
      ext: detectedFileType.ext,
      mime: detectedFileType.mime,
    };
  }

  private async detectWithFileTypePackage(
    buffer: Buffer,
  ): Promise<DetectedDocumentFileType | undefined> {
    try {
      const fileTypeModule = requireFileType(
        'file-type',
      ) as FileTypePackageModule;
      return fileTypeModule.fileTypeFromBuffer(buffer);
    } catch (error) {
      if (process.env.JEST_WORKER_ID) {
        return detectWithJestFallback(buffer);
      }

      throw error;
    }
  }
}

function detectWithJestFallback(
  buffer: Buffer,
): DetectedDocumentFileType | undefined {
  if (buffer.subarray(0, 4).toString('ascii') === '%PDF') {
    return { ext: 'pdf', mime: 'application/pdf' };
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }

  if (buffer[0] === 0x89 && buffer.subarray(1, 4).toString('ascii') === 'PNG') {
    return { ext: 'png', mime: 'image/png' };
  }

  if (buffer.subarray(4, 12).toString('ascii') === 'ftypheic') {
    return { ext: 'heic', mime: 'image/heic' };
  }

  if (
    buffer.subarray(0, 4).toString('binary') === 'PK\u0003\u0004' &&
    buffer.includes(Buffer.from('[Content_Types].xml')) &&
    buffer.includes(Buffer.from('word/'))
  ) {
    return {
      ext: 'docx',
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  return undefined;
}
