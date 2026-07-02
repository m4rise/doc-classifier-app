import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { PinoLogger } from 'nestjs-pino';
import { AuthModule } from '../auth/auth.module';
import { AppConfiguration } from '../config/app.config';
import { LlmModule } from '../llm/llm.module';
import {
  CONFIDENCE_THRESHOLD,
  DOCUMENT_ANALYZER,
  DOCUMENT_DOWNLOAD_URL_TTL_SECONDS,
  DOCUMENT_REPOSITORY,
  FILE_SIZE_LIMIT_BYTES,
  FILE_STORAGE,
  FILE_TYPE_DETECTOR,
} from './application/documents.tokens';
import { DocumentAnalyzer } from './application/ports/document-analyzer.port';
import { DocumentRepository } from './application/ports/document.repository.port';
import { FileStorage } from './application/ports/file-storage.port';
import { FileTypeDetector } from './application/ports/file-type-detector.port';
import { DeleteDocumentUseCase } from './application/use-cases/delete-document.use-case';
import { GetDocumentUseCase } from './application/use-cases/get-document.use-case';
import { ListDocumentsUseCase } from './application/use-cases/list-documents.use-case';
import { ProcessDocumentUseCase } from './application/use-cases/process-document.use-case';
import { UploadDocumentUseCase } from './application/use-cases/upload-document.use-case';
import { SynchronousDocumentProcessingWorkflow } from './application/workflows/synchronous-document-processing.workflow';
import { FileTypePackageDetector } from './infrastructure/file-type/file-type-package-detector';
import { PrismaDocumentRepository } from './infrastructure/persistence/prisma-document.repository';
import { GcsFileStorage } from './infrastructure/storage/gcs-file-storage';
import { LocalFileStorage } from './infrastructure/storage/local-file-storage';
import { DocumentsController } from './presentation/documents.controller';

const BYTES_PER_MEGABYTE = 1024 * 1024;

@Module({
  imports: [
    AuthModule,
    LlmModule,
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfiguration, true>) => {
        const documents = configService.getOrThrow('documents', {
          infer: true,
        });

        return {
          limits: {
            fileSize: toBytes(documents.upload.fileSizeLimitMb),
          },
        };
      },
    }),
  ],
  controllers: [DocumentsController],
  providers: [
    PrismaDocumentRepository,
    FileTypePackageDetector,
    {
      provide: LocalFileStorage,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfiguration, true>) => {
        const documents = configService.getOrThrow('documents', {
          infer: true,
        });

        return new LocalFileStorage(documents.storage.localUploadDir);
      },
    },
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
        configService: ConfigService<AppConfiguration, true>,
      ): FileStorage => {
        const documents = configService.getOrThrow('documents', {
          infer: true,
        });

        if (documents.storage.driver !== 'gcs') {
          return localFileStorage;
        }

        const { bucketName, projectId } = documents.storage.gcs;

        if (!bucketName || !projectId) {
          throw new Error(
            'GCS_BUCKET_NAME and GCS_PROJECT_ID are required when FILE_STORAGE_DRIVER=gcs',
          );
        }

        return new GcsFileStorage({ bucketName, projectId });
      },
      inject: [LocalFileStorage, ConfigService],
    },
    {
      provide: FILE_SIZE_LIMIT_BYTES,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfiguration, true>) =>
        toBytes(
          configService.getOrThrow('documents', { infer: true }).upload
            .fileSizeLimitMb,
        ),
    },
    {
      provide: CONFIDENCE_THRESHOLD,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfiguration, true>) =>
        configService.getOrThrow('documents', { infer: true }).classification
          .confidenceThreshold,
    },
    {
      provide: DOCUMENT_DOWNLOAD_URL_TTL_SECONDS,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfiguration, true>) =>
        configService.getOrThrow('documents', { infer: true }).download
          .signedUrlTtlSeconds,
    },
    {
      provide: DeleteDocumentUseCase,
      useFactory: (
        documentRepository: DocumentRepository,
        fileStorage: FileStorage,
        logger: PinoLogger,
      ) => {
        logger.setContext(DeleteDocumentUseCase.name);
        return new DeleteDocumentUseCase(
          documentRepository,
          fileStorage,
          logger,
        );
      },
      inject: [DOCUMENT_REPOSITORY, FILE_STORAGE, PinoLogger],
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
      useFactory: (
        documentRepository: DocumentRepository,
        fileStorage: FileStorage,
        downloadUrlTtlSeconds: number,
      ) =>
        new GetDocumentUseCase(
          documentRepository,
          fileStorage,
          downloadUrlTtlSeconds,
        ),
      inject: [
        DOCUMENT_REPOSITORY,
        FILE_STORAGE,
        DOCUMENT_DOWNLOAD_URL_TTL_SECONDS,
      ],
    },
    {
      provide: ListDocumentsUseCase,
      useFactory: (documentRepository: DocumentRepository) =>
        new ListDocumentsUseCase(documentRepository),
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

function toBytes(megabytes: number): number {
  return megabytes * BYTES_PER_MEGABYTE;
}
