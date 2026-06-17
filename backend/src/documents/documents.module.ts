import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { AuthModule } from '../auth/auth.module';
import { IFileStorage } from '../shared/interfaces/IFileStorage';
import {
  DOCUMENT_REPOSITORY,
  FILE_SIZE_LIMIT_BYTES,
  FILE_STORAGE,
  FILE_TYPE_DETECTOR,
} from './application/documents.tokens';
import { DocumentRepository } from './application/ports/document.repository.port';
import { FileTypeDetector } from './application/ports/file-type-detector.port';
import { UploadDocumentUseCase } from './application/use-cases/upload-document.use-case';
import { resolveFileSizeLimitBytes } from './infrastructure/config/file-size-limit';
import { FileTypePackageDetector } from './infrastructure/file-type/file-type-package-detector';
import { PrismaDocumentRepository } from './infrastructure/persistence/prisma-document.repository';
import { GcsFileStorage } from './infrastructure/storage/gcs-file-storage';
import { LocalFileStorage } from './infrastructure/storage/local-file-storage';
import { DocumentsController } from './presentation/documents.controller';

type FileStorageDriver = 'local' | 'gcs';

@Module({
  imports: [
    AuthModule,
    MulterModule.register({
      limits: { fileSize: resolveFileSizeLimitBytes() },
    }),
  ],
  controllers: [DocumentsController],
  providers: [
    PrismaDocumentRepository,
    FileTypePackageDetector,
    LocalFileStorage,
    GcsFileStorage,
    {
      provide: DOCUMENT_REPOSITORY,
      useExisting: PrismaDocumentRepository,
    },
    {
      provide: FILE_TYPE_DETECTOR,
      useExisting: FileTypePackageDetector,
    },
    {
      provide: FILE_STORAGE,
      useFactory: (
        localFileStorage: LocalFileStorage,
        gcsFileStorage: GcsFileStorage,
      ): IFileStorage =>
        resolveFileStorageDriver() === 'gcs'
          ? gcsFileStorage
          : localFileStorage,
      inject: [LocalFileStorage, GcsFileStorage],
    },
    {
      provide: FILE_SIZE_LIMIT_BYTES,
      useValue: resolveFileSizeLimitBytes(),
    },
    {
      provide: UploadDocumentUseCase,
      useFactory: (
        documentRepository: DocumentRepository,
        fileStorage: IFileStorage,
        fileTypeDetector: FileTypeDetector,
        fileSizeLimitBytes: number,
      ) =>
        new UploadDocumentUseCase(
          documentRepository,
          fileStorage,
          fileTypeDetector,
          fileSizeLimitBytes,
        ),
      inject: [
        DOCUMENT_REPOSITORY,
        FILE_STORAGE,
        FILE_TYPE_DETECTOR,
        FILE_SIZE_LIMIT_BYTES,
      ],
    },
  ],
})
export class DocumentsModule {}

function resolveFileStorageDriver(): FileStorageDriver {
  return process.env.FILE_STORAGE_DRIVER?.trim().toLowerCase() === 'gcs'
    ? 'gcs'
    : 'local';
}
