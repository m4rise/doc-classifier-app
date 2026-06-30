import { Injectable } from '@nestjs/common';
import { DocumentStatus } from '../../../generated/prisma';
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
      },
      select: documentDetailSelection,
    });

    return document ? mapDocumentDetail(document) : null;
  }

  listForUser(
    input: ListDocumentsRepositoryInput,
  ): Promise<ListDocumentsRepositoryResult | null> {
    return this.prisma.$transaction(async (transaction) => {
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
        const cursorDocument = await transaction.document.findUnique({
          where: cursor,
          select: { id: true },
        });

        if (!cursorDocument) {
          return null;
        }
      }

      const documents = await transaction.document.findMany({
        where: { userId: input.userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: input.limit + 1,
        cursor,
        skip: cursor ? 1 : undefined,
        select: documentListItemSelection,
      });
      const total = await transaction.document.count({
        where: { userId: input.userId },
      });

      return {
        documents: documents.map(mapDocumentListItem),
        total,
      };
    });
  }
}
