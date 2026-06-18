import { DetectedDocumentFileType } from '../../domain/services/document-file-policy';

export abstract class FileTypeDetector {
  abstract detect(buffer: Buffer): Promise<DetectedDocumentFileType | null>;
}
