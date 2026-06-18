import { Injectable } from '@nestjs/common';
import { DocumentStatus } from '../../../generated/prisma';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import {
  CreatePendingDocumentInput,
  DocumentRepository,
  UploadedDocument,
} from '../../application/ports/document.repository.port';

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
}
