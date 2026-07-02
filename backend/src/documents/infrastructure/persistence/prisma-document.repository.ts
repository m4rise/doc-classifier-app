import { Injectable } from '@nestjs/common';
import { DocumentStatus, Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import {
  CompletedProcessingResult,
  DocumentDetail,
  CreatePendingDocumentInput,
  DocumentDetails,
  DocumentRepository,
  ListDocumentsRepositoryInput,
  ListDocumentsRepositoryResult,
  ProcessingDocument,
  SoftDeletedDocument,
  UploadedDocument,
} from '../../application/ports/document.repository.port';
import {
  documentDetailSelection,
  documentDetailsSelection,
  documentListItemSelection,
  mapDocumentDetail,
  mapDocumentDetails,
  mapDocumentListItem,
} from './prisma-document.mapper';

@Injectable()
export class PrismaDocumentRepository extends DocumentRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createPending(
    input: CreatePendingDocumentInput,
  ): Promise<UploadedDocument> {
    const document = await this.prisma.document.create({
      data: {
        userId: input.userId,
        originalName: input.originalName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        storageKey: input.storageKey,
        status: DocumentStatus.PENDING,
      },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
      },
    });

    return {
      id: document.id,
      status: 'PENDING',
      originalName: document.originalName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
    };
  }

  beginProcessing(documentId: string): Promise<ProcessingDocument | null> {
    return this.prisma.$transaction(async (transaction) => {
      const transition = await transaction.document.updateMany({
        where: {
          id: documentId,
          status: DocumentStatus.PENDING,
          deletedAt: null,
        },
        data: { status: DocumentStatus.PROCESSING },
      });

      if (transition.count !== 1) {
        return null;
      }

      return transaction.document.findUniqueOrThrow({
        where: { id: documentId },
        select: {
          id: true,
          storageKey: true,
          mimeType: true,
        },
      });
    });
  }

  completeProcessing(
    documentId: string,
    result: CompletedProcessingResult,
  ): Promise<DocumentDetails> {
    return this.prisma.$transaction(async (transaction) => {
      const transition = await transaction.document.updateMany({
        where: {
          id: documentId,
          status: DocumentStatus.PROCESSING,
          deletedAt: null,
        },
        data: { status: DocumentStatus.DONE },
      });

      if (transition.count !== 1) {
        throw new Error('Document is not in PROCESSING status');
      }

      await transaction.processingResult.create({
        data: {
          documentId,
          ...result,
          errorMessage: null,
        },
      });

      const document = await transaction.document.findUniqueOrThrow({
        where: { id: documentId },
        select: documentDetailsSelection,
      });

      return mapDocumentDetails(document);
    });
  }

  failProcessing(
    documentId: string,
    errorMessage: string,
  ): Promise<DocumentDetails> {
    return this.prisma.$transaction(async (transaction) => {
      const transition = await transaction.document.updateMany({
        where: {
          id: documentId,
          status: DocumentStatus.PROCESSING,
          deletedAt: null,
        },
        data: { status: DocumentStatus.FAILED },
      });

      if (transition.count !== 1) {
        throw new Error('Document is not in PROCESSING status');
      }

      await transaction.processingResult.create({
        data: {
          documentId,
          extractedText: null,
          classification: null,
          summary: null,
          confidenceScore: null,
          language: null,
          needsReview: false,
          errorMessage,
        },
      });

      const document = await transaction.document.findUniqueOrThrow({
        where: { id: documentId },
        select: documentDetailsSelection,
      });

      return mapDocumentDetails(document);
    });
  }

  async findByIdForUser(
    documentId: string,
    userId: string,
  ): Promise<DocumentDetail | null> {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        userId,
        deletedAt: null,
      },
      select: documentDetailSelection,
    });

    return document ? mapDocumentDetail(document) : null;
  }

  softDeleteForUser(
    documentId: string,
    userId: string,
  ): Promise<SoftDeletedDocument | null> {
    return this.prisma.$transaction(async (transaction) => {
      const transition = await transaction.document.updateMany({
        where: {
          id: documentId,
          userId,
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });

      if (transition.count !== 1) {
        return null;
      }

      return transaction.document.findUniqueOrThrow({
        where: { id: documentId },
        select: {
          id: true,
          storageKey: true,
        },
      });
    });
  }

  async hardDelete(documentId: string, userId: string): Promise<void> {
    const deletion = await this.prisma.document.deleteMany({
      where: {
        id: documentId,
        userId,
        deletedAt: { not: null },
      },
    });

    if (deletion.count !== 1) {
      throw new Error(
        'Owned soft-deleted document could not be physically deleted',
      );
    }
  }

  listForUser(
    input: ListDocumentsRepositoryInput,
  ): Promise<ListDocumentsRepositoryResult | null> {
    return this.prisma.$transaction(
      async (transaction) => {
        const cursor = input.cursor
          ? {
              userId_createdAt_id: {
                userId: input.userId,
                createdAt: input.cursor.createdAt,
                id: input.cursor.id,
              },
            }
          : undefined;

        if (cursor) {
          const cursorDocument = await transaction.document.findFirst({
            where: {
              userId: input.userId,
              createdAt: input.cursor?.createdAt,
              id: input.cursor?.id,
              deletedAt: null,
            },
            select: { id: true },
          });

          if (!cursorDocument) {
            return null;
          }
        }

        const documents = await transaction.document.findMany({
          where: { userId: input.userId, deletedAt: null },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: input.limit + 1,
          cursor,
          skip: cursor ? 1 : undefined,
          select: documentListItemSelection,
        });
        const total = await transaction.document.count({
          where: { userId: input.userId, deletedAt: null },
        });

        return {
          documents: documents.map(mapDocumentListItem),
          total,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
}
