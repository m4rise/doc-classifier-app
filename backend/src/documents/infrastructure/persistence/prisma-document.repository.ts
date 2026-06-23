import { Injectable } from '@nestjs/common';
import { DocumentStatus } from '../../../generated/prisma';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import {
  CompletedProcessingResult,
  CreatePendingDocumentInput,
  DocumentDetails,
  DocumentRepository,
  ProcessingDocument,
  UploadedDocument,
} from '../../application/ports/document.repository.port';

interface PersistedDocumentDetails {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  processingResult: {
    extractedText: string | null;
    classification: string | null;
    summary: string | null;
    confidenceScore: number | null;
    language: string | null;
    needsReview: boolean;
    errorMessage: string | null;
  } | null;
}

const documentDetailsSelection = {
  id: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  status: true,
  processingResult: {
    select: {
      extractedText: true,
      classification: true,
      summary: true,
      confidenceScore: true,
      language: true,
      needsReview: true,
      errorMessage: true,
    },
  },
} as const;

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
  ): Promise<DocumentDetails | null> {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        userId,
      },
      select: documentDetailsSelection,
    });

    return document ? mapDocumentDetails(document) : null;
  }
}

function mapDocumentDetails(
  document: PersistedDocumentDetails,
): DocumentDetails {
  return {
    id: document.id,
    status: document.status,
    originalName: document.originalName,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    extractedText: document.processingResult?.extractedText ?? null,
    classification: document.processingResult?.classification ?? null,
    summary: document.processingResult?.summary ?? null,
    confidenceScore: document.processingResult?.confidenceScore ?? null,
    language: document.processingResult?.language ?? null,
    needsReview: document.processingResult?.needsReview ?? false,
    errorMessage: document.processingResult?.errorMessage ?? null,
  };
}
