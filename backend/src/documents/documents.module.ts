import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { AiModule } from '../ai/ai.module';
import { LLM_PROVIDER } from '../ai/application/ai.tokens';
import { AuthModule } from '../auth/auth.module';
import { IFileStorage } from '../shared/interfaces/IFileStorage';
import { ILlmProvider } from '../shared/interfaces/ILlmProvider';
import {
  DOCUMENT_REPOSITORY,
  FILE_SIZE_LIMIT_BYTES,
  FILE_STORAGE,
  FILE_TYPE_DETECTOR,
} from './application/documents.tokens';
import { DocumentRepository } from './application/ports/document.repository.port';
import { FileTypeDetector } from './application/ports/file-type-detector.port';
import { ClassifyDocumentUseCase } from './application/use-cases/classify-document.use-case';
import { GetDocumentUseCase } from './application/use-cases/get-document.use-case';
import { UploadDocumentUseCase } from './application/use-cases/upload-document.use-case';
import { resolveFileStorageDriver } from './infrastructure/config/file-storage.config';
import { resolveFileSizeLimitBytes } from './infrastructure/config/file-size-limit';
import { FileTypePackageDetector } from './infrastructure/file-type/file-type-package-detector';
import { PrismaDocumentRepository } from './infrastructure/persistence/prisma-document.repository';
import { GcsFileStorage } from './infrastructure/storage/gcs-file-storage';
import { LocalFileStorage } from './infrastructure/storage/local-file-storage';
import { DocumentsController } from './presentation/documents.controller';

@Module({
  imports: [
    AuthModule,
    AiModule,
    MulterModule.register({
      limits: { fileSize: resolveFileSizeLimitBytes() },
    }),
  ],
  controllers: [DocumentsController],
  providers: [
    PrismaDocumentRepository,
    FileTypePackageDetector,
    LocalFileStorage,
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
      useFactory: (localFileStorage: LocalFileStorage): IFileStorage =>
        resolveFileStorageDriver() === 'gcs'
          ? new GcsFileStorage()
          : localFileStorage,
      inject: [LocalFileStorage],
    },
    {
      provide: FILE_SIZE_LIMIT_BYTES,
      useValue: resolveFileSizeLimitBytes(),
    },
    {
      provide: ClassifyDocumentUseCase,
      useFactory: (
        llmProvider: ILlmProvider,
        documentRepository: DocumentRepository,
        fileStorage: IFileStorage,
      ) =>
        new ClassifyDocumentUseCase(
          llmProvider,
          documentRepository,
          fileStorage,
        ),
      inject: [LLM_PROVIDER, DOCUMENT_REPOSITORY, FILE_STORAGE],
    },
    {
      provide: GetDocumentUseCase,
      useFactory: (documentRepository: DocumentRepository) =>
        new GetDocumentUseCase(documentRepository),
      inject: [DOCUMENT_REPOSITORY],
    },
    {
      provide: UploadDocumentUseCase,
      useFactory: (
        documentRepository: DocumentRepository,
        fileStorage: IFileStorage,
        fileTypeDetector: FileTypeDetector,
        fileSizeLimitBytes: number,
        classifyDocumentUseCase: ClassifyDocumentUseCase,
      ) =>
        new UploadDocumentUseCase(
          documentRepository,
          fileStorage,
          fileTypeDetector,
          fileSizeLimitBytes,
          classifyDocumentUseCase,
        ),
      inject: [
        DOCUMENT_REPOSITORY,
        FILE_STORAGE,
        FILE_TYPE_DETECTOR,
        FILE_SIZE_LIMIT_BYTES,
        ClassifyDocumentUseCase,
      ],
    },
  ],
})
export class DocumentsModule {}
