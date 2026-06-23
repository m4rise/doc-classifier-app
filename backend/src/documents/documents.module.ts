import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { AuthModule } from '../auth/auth.module';
import { LlmModule } from '../llm/llm.module';
import {
  CONFIDENCE_THRESHOLD,
  DOCUMENT_ANALYZER,
  DOCUMENT_REPOSITORY,
  FILE_SIZE_LIMIT_BYTES,
  FILE_STORAGE,
  FILE_TYPE_DETECTOR,
} from './application/documents.tokens';
import { DocumentAnalyzer } from './application/ports/document-analyzer.port';
import { DocumentRepository } from './application/ports/document.repository.port';
import { FileStorage } from './application/ports/file-storage.port';
import { FileTypeDetector } from './application/ports/file-type-detector.port';
import { GetDocumentUseCase } from './application/use-cases/get-document.use-case';
import { ProcessDocumentUseCase } from './application/use-cases/process-document.use-case';
import { UploadDocumentUseCase } from './application/use-cases/upload-document.use-case';
import { SynchronousDocumentProcessingWorkflow } from './application/workflows/synchronous-document-processing.workflow';
import { resolveConfidenceThreshold } from './infrastructure/config/confidence-threshold.config';
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
    LlmModule,
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
      useFactory: (localFileStorage: LocalFileStorage): FileStorage =>
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
      provide: CONFIDENCE_THRESHOLD,
      useValue: resolveConfidenceThreshold(),
    },
    {
      provide: ProcessDocumentUseCase,
      useFactory: (
        documentAnalyzer: DocumentAnalyzer,
        documentRepository: DocumentRepository,
        fileStorage: FileStorage,
        confidenceThreshold: number,
      ) =>
        new ProcessDocumentUseCase(
          documentAnalyzer,
          documentRepository,
          fileStorage,
          confidenceThreshold,
        ),
      inject: [
        DOCUMENT_ANALYZER,
        DOCUMENT_REPOSITORY,
        FILE_STORAGE,
        CONFIDENCE_THRESHOLD,
      ],
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
        fileStorage: FileStorage,
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
    {
      provide: SynchronousDocumentProcessingWorkflow,
      useFactory: (
        uploadDocument: UploadDocumentUseCase,
        processDocument: ProcessDocumentUseCase,
      ) =>
        new SynchronousDocumentProcessingWorkflow(
          uploadDocument,
          processDocument,
        ),
      inject: [UploadDocumentUseCase, ProcessDocumentUseCase],
    },
  ],
})
export class DocumentsModule {}
