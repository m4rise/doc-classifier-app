import { rm, stat } from 'fs/promises';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { DOCUMENT_ANALYZER } from '../application/documents.tokens';
import { DocumentAnalysisTimeoutError } from '../application/errors/document-analysis.errors';
import { DocumentStatus } from '../../generated/prisma';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import { PrismaDocumentRepository } from '../infrastructure/persistence/prisma-document.repository';
import { LocalFileStorage } from '../infrastructure/storage/local-file-storage';
import { asErrorMessageBody } from '../../../test/integration-http.helpers';
import type {
  HttpResponseBody,
  LoginResponseBody,
  RegisterResponseBody,
} from '../../../test/integration-http.helpers';

interface UploadDocumentResponseBody {
  id: string;
  status: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  extractedText: string | null;
  classification: string | null;
  summary: string | null;
  confidenceScore: number | null;
  language: string | null;
  needsReview: boolean;
  errorMessage: string | null;
}

interface DocumentDetailResponseBody extends UploadDocumentResponseBody {
  createdAt: string;
  updatedAt: string;
  processedAt: string | null;
  downloadUrl: string;
}

interface DocumentListItemResponseBody {
  id: string;
  status: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  classification: string | null;
  confidenceScore: number | null;
  needsReview: boolean;
  createdAt: string;
}

interface ListDocumentsResponseBody {
  data: DocumentListItemResponseBody[];
  nextCursor: string | null;
  total: number;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let forwardedIpHost = 100;

function nextForwardedIp(): string {
  forwardedIpHost += 1;
  return `198.51.100.${forwardedIpHost}`;
}

function encodeCursorPayload(payload: object): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
}

function createValidPdfBuffer(): Buffer {
  return Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF', 'utf8');
}

function createJpegBuffer(): Buffer {
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);
}

function createHeicBuffer(): Buffer {
  return Buffer.from([
    0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63,
    0x00, 0x00, 0x00, 0x00, 0x68, 0x65, 0x69, 0x63,
  ]);
}

function createPngBuffer(): Buffer {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

function createDocxBuffer(): Buffer {
  return Buffer.concat([
    createZipLocalHeader('[Content_Types].xml'),
    createZipLocalHeader('_rels/.rels'),
    createZipLocalHeader('word/document.xml'),
  ]);
}

function createZipLocalHeader(fileName: string): Buffer {
  const fileNameBuffer = Buffer.from(fileName, 'utf8');
  const header = Buffer.alloc(30);

  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt32LE(0, 14);
  header.writeUInt32LE(0, 18);
  header.writeUInt32LE(0, 22);
  header.writeUInt16LE(fileNameBuffer.length, 26);
  header.writeUInt16LE(0, 28);

  return Buffer.concat([header, fileNameBuffer]);
}

async function registerAndLogin(
  app: NestExpressApplication,
  email: string,
): Promise<{ user: RegisterResponseBody; accessToken: string }> {
  const ip = nextForwardedIp();

  const registerResponse = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .set('X-Forwarded-For', ip)
    .send({
      email,
      password: 'super-secure-password',
      tosAccepted: true,
      tosVersion: '1.0',
    })
    .expect(201);

  const loginResponse = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('X-Forwarded-For', ip)
    .send({
      email,
      password: 'super-secure-password',
    })
    .expect(200);

  return {
    user: registerResponse.body as RegisterResponseBody,
    accessToken: (loginResponse.body as LoginResponseBody).accessToken,
  };
}

describe('DocumentsController integration', () => {
  const originalFileStorageDriver = process.env.FILE_STORAGE_DRIVER;
  const originalLocalUploadDir = process.env.LOCAL_UPLOAD_DIR;
  const uploadDir = join(process.cwd(), 'uploads', 'jest-documents-upload');
  let app: NestExpressApplication;
  let documentRepository: PrismaDocumentRepository;
  let localFileStorage: LocalFileStorage;
  let prisma: PrismaService;
  const successfulAnalysis = {
    extractedText: 'Invoice #2026-001',
    classification: 'invoice',
    summary: 'Invoice for professional services.',
    confidenceScore: 0.94,
    language: 'en',
  };
  const analyze = jest.fn(() => Promise.resolve(successfulAnalysis));

  async function createCompletedDocument(
    userId: string,
    sequence: number,
    createdAt: Date,
    id?: string,
  ) {
    return prisma.document.create({
      data: {
        ...(id ? { id } : {}),
        userId,
        originalName: `document-${sequence}.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: 100 + sequence,
        status: DocumentStatus.DONE,
        createdAt,
        processingResult: {
          create: {
            extractedText: `Document ${sequence}`,
            classification: sequence % 2 === 0 ? 'invoice' : 'contract',
            summary: `Summary ${sequence}`,
            confidenceScore: Number((0.8 + sequence / 100).toFixed(2)),
            language: 'en',
            needsReview: sequence % 3 === 0,
            errorMessage: null,
          },
        },
      },
    });
  }

  beforeAll(async () => {
    process.env.FILE_STORAGE_DRIVER = 'local';
    process.env.LOCAL_UPLOAD_DIR = uploadDir;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DOCUMENT_ANALYZER)
      .useValue({ analyze })
      .compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.set('trust proxy', 1);
    await app.init();
    documentRepository = app.get(PrismaDocumentRepository);
    localFileStorage = app.get(LocalFileStorage);
    prisma = app.get(PrismaService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    analyze.mockReset();
    analyze.mockResolvedValue(successfulAnalysis);
    await rm(uploadDir, { recursive: true, force: true });
    await prisma.processingResult.deleteMany();
    await prisma.document.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.consentRecord.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
    await rm(uploadDir, { recursive: true, force: true });

    if (originalLocalUploadDir === undefined) {
      delete process.env.LOCAL_UPLOAD_DIR;
    } else {
      process.env.LOCAL_UPLOAD_DIR = originalLocalUploadDir;
    }

    if (originalFileStorageDriver === undefined) {
      delete process.env.FILE_STORAGE_DRIVER;
    } else {
      process.env.FILE_STORAGE_DRIVER = originalFileStorageDriver;
    }
  });

  it('POST upload returns 201/DONE and owner GET returns the persisted analysis', async () => {
    const email = `document-upload.${Date.now()}@example.com`;
    const { user, accessToken } = await registerAndLogin(app, email);
    const pdfBuffer = createValidPdfBuffer();

    const uploadResponse = await request(app.getHttpServer())
      .post('/api/v1/documents/upload')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', pdfBuffer, {
        filename: 'invoice.pdf',
        contentType: 'application/pdf',
      })
      .expect(201)
      .expect((res: HttpResponseBody) => {
        const body = res.body as UploadDocumentResponseBody;
        expect(body.id).toEqual(expect.any(String));
        expect(body.status).toBe('DONE');
        expect(body.originalName).toBe('invoice.pdf');
        expect(body.mimeType).toBe('application/pdf');
        expect(body.sizeBytes).toBe(pdfBuffer.length);
        expect(body.extractedText).toBe('Invoice #2026-001');
        expect(body.classification).toBe('invoice');
        expect(body.summary).toBe('Invoice for professional services.');
        expect(body.confidenceScore).toBe(0.94);
        expect(body.language).toBe('en');
        expect(body.needsReview).toBe(false);
        expect(body.errorMessage).toBeNull();
      });

    const body = uploadResponse.body as UploadDocumentResponseBody;
    const persistedDocument = await prisma.document.findUnique({
      where: { id: body.id },
      include: { processingResult: true },
    });

    expect(persistedDocument).toMatchObject({
      id: body.id,
      userId: user.id,
      originalName: 'invoice.pdf',
      mimeType: 'application/pdf',
      sizeBytes: pdfBuffer.length,
      status: DocumentStatus.DONE,
    });
    expect(persistedDocument?.storageKey).toMatch(uuidPattern);
    expect(persistedDocument?.storageKey).not.toBe('invoice.pdf');
    await expect(
      stat(join(uploadDir, persistedDocument?.storageKey ?? 'missing')),
    ).resolves.toMatchObject({
      size: pdfBuffer.length,
    });
    expect(persistedDocument?.processingResult).toMatchObject({
      extractedText: 'Invoice #2026-001',
      classification: 'invoice',
      summary: 'Invoice for professional services.',
      confidenceScore: 0.94,
      language: 'en',
      needsReview: false,
      errorMessage: null,
    });
    expect(analyze).toHaveBeenCalledWith({
      fileBuffer: pdfBuffer,
      mimeType: 'application/pdf',
    });

    await request(app.getHttpServer())
      .get(`/api/v1/documents/${body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res: HttpResponseBody) => {
        const detail = res.body as DocumentDetailResponseBody;
        expect(detail).toMatchObject(body);
        expect(detail.createdAt).toEqual(expect.any(String));
        expect(detail.updatedAt).toEqual(expect.any(String));
        expect(detail.processedAt).toEqual(expect.any(String));
        expect(detail.downloadUrl).toBe(
          pathToFileURL(
            join(uploadDir, persistedDocument?.storageKey ?? 'missing'),
          ).toString(),
        );
        expect(detail).not.toHaveProperty('storageKey');
      });
  });

  it('GET /api/v1/documents/:id returns 404 to a non-owner', async () => {
    const owner = await registerAndLogin(
      app,
      `document-owner.${Date.now()}@example.com`,
    );
    const otherUser = await registerAndLogin(
      app,
      `document-non-owner.${Date.now()}@example.com`,
    );

    const uploadResponse = await request(app.getHttpServer())
      .post('/api/v1/documents/upload')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .attach('file', createValidPdfBuffer(), {
        filename: 'private.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    const documentId = (uploadResponse.body as UploadDocumentResponseBody).id;

    await request(app.getHttpServer())
      .get(`/api/v1/documents/${documentId}`)
      .set('Authorization', `Bearer ${otherUser.accessToken}`)
      .expect(404);
  });

  it('DELETE /api/v1/documents/:id removes storage, DB data, and future access', async () => {
    const { accessToken } = await registerAndLogin(
      app,
      `document-delete.${Date.now()}@example.com`,
    );
    const uploadResponse = await request(app.getHttpServer())
      .post('/api/v1/documents/upload')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', createValidPdfBuffer(), {
        filename: 'delete-me.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    const documentId = (uploadResponse.body as UploadDocumentResponseBody).id;
    const persistedDocument = await prisma.document.findUniqueOrThrow({
      where: { id: documentId },
      select: { storageKey: true },
    });

    await request(app.getHttpServer())
      .delete(`/api/v1/documents/${documentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await expect(
      prisma.document.findUnique({ where: { id: documentId } }),
    ).resolves.toBeNull();
    await expect(
      prisma.processingResult.findUnique({ where: { documentId } }),
    ).resolves.toBeNull();
    await expect(
      stat(join(uploadDir, persistedDocument.storageKey)),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    await request(app.getHttpServer())
      .get(`/api/v1/documents/${documentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/documents')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(listResponse.body).toMatchObject({ data: [], total: 0 });

    await request(app.getHttpServer())
      .delete(`/api/v1/documents/${documentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('DELETE /api/v1/documents/:id returns 404 without deleting another user document', async () => {
    const owner = await registerAndLogin(
      app,
      `document-delete-owner.${Date.now()}@example.com`,
    );
    const otherUser = await registerAndLogin(
      app,
      `document-delete-other.${Date.now()}@example.com`,
    );
    const uploadResponse = await request(app.getHttpServer())
      .post('/api/v1/documents/upload')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .attach('file', createValidPdfBuffer(), {
        filename: 'private-delete.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    const documentId = (uploadResponse.body as UploadDocumentResponseBody).id;

    await request(app.getHttpServer())
      .delete(`/api/v1/documents/${documentId}`)
      .set('Authorization', `Bearer ${otherUser.accessToken}`)
      .expect(404);

    await expect(
      prisma.document.findUnique({ where: { id: documentId } }),
    ).resolves.toMatchObject({ id: documentId, deletedAt: null });
  });

  it('keeps a failed storage deletion as an inaccessible retryable tombstone', async () => {
    const { accessToken } = await registerAndLogin(
      app,
      `document-delete-storage-failure.${Date.now()}@example.com`,
    );
    const uploadResponse = await request(app.getHttpServer())
      .post('/api/v1/documents/upload')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', createValidPdfBuffer(), {
        filename: 'retry-delete.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    const documentId = (uploadResponse.body as UploadDocumentResponseBody).id;
    const persistedDocument = await prisma.document.findUniqueOrThrow({
      where: { id: documentId },
      select: { storageKey: true },
    });
    jest
      .spyOn(localFileStorage, 'delete')
      .mockRejectedValueOnce(new Error('storage unavailable'));

    await request(app.getHttpServer())
      .delete(`/api/v1/documents/${documentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const tombstone = await prisma.document.findUnique({
      where: { id: documentId },
    });
    expect(tombstone?.id).toBe(documentId);
    expect(tombstone?.deletedAt).toBeInstanceOf(Date);
    await expect(
      stat(join(uploadDir, persistedDocument.storageKey)),
    ).resolves.toBeDefined();
    await request(app.getHttpServer())
      .get(`/api/v1/documents/${documentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/documents')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(listResponse.body).toMatchObject({ data: [], total: 0 });
  });

  it('does not claim a soft-deleted pending document for processing', async () => {
    const { user } = await registerAndLogin(
      app,
      `document-processing-tombstone.${Date.now()}@example.com`,
    );
    const document = await prisma.document.create({
      data: {
        userId: user.id,
        originalName: 'pending-delete.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 128,
        status: DocumentStatus.PENDING,
        deletedAt: new Date(),
      },
    });

    await expect(
      documentRepository.beginProcessing(document.id),
    ).resolves.toBeNull();
    await expect(
      prisma.document.findUnique({ where: { id: document.id } }),
    ).resolves.toMatchObject({
      status: DocumentStatus.PENDING,
      deletedAt: document.deletedAt,
    });
  });

  it('keeps physical deletion scoped to the tombstone owner', async () => {
    const owner = await registerAndLogin(
      app,
      `document-hard-delete-owner.${Date.now()}@example.com`,
    );
    const otherUser = await registerAndLogin(
      app,
      `document-hard-delete-other.${Date.now()}@example.com`,
    );
    const document = await prisma.document.create({
      data: {
        userId: owner.user.id,
        originalName: 'owned-tombstone.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 128,
        status: DocumentStatus.DONE,
        deletedAt: new Date(),
      },
    });

    await expect(
      documentRepository.hardDelete(document.id, otherUser.user.id),
    ).rejects.toThrow(
      'Owned soft-deleted document could not be physically deleted',
    );
    await expect(
      prisma.document.findUnique({ where: { id: document.id } }),
    ).resolves.toMatchObject({ id: document.id });

    await expect(
      documentRepository.hardDelete(document.id, owner.user.id),
    ).resolves.toBeUndefined();
    await expect(
      prisma.document.findUnique({ where: { id: document.id } }),
    ).resolves.toBeNull();
  });

  it('GET /api/v1/documents lists only owner documents with essential metadata', async () => {
    const owner = await registerAndLogin(
      app,
      `document-list-owner.${Date.now()}@example.com`,
    );
    const otherUser = await registerAndLogin(
      app,
      `document-list-other.${Date.now()}@example.com`,
    );
    const older = await createCompletedDocument(
      owner.user.id,
      1,
      new Date('2026-06-24T08:00:00.000Z'),
    );
    const newer = await createCompletedDocument(
      owner.user.id,
      2,
      new Date('2026-06-24T09:00:00.000Z'),
    );
    await createCompletedDocument(
      otherUser.user.id,
      3,
      new Date('2026-06-24T10:00:00.000Z'),
    );

    await request(app.getHttpServer())
      .get('/api/v1/documents')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200)
      .expect((res: HttpResponseBody) => {
        const body = res.body as ListDocumentsResponseBody;
        expect(body.total).toBe(2);
        expect(body.nextCursor).toBeNull();
        expect(body.data.map((document) => document.id)).toEqual([
          newer.id,
          older.id,
        ]);
        expect(body.data[0]).toEqual({
          id: newer.id,
          status: 'DONE',
          originalName: 'document-2.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 102,
          classification: 'invoice',
          confidenceScore: 0.82,
          needsReview: false,
          createdAt: '2026-06-24T09:00:00.000Z',
        });
      });
  });

  it('paginates all owner documents without duplicates and preserves total', async () => {
    const { user, accessToken } = await registerAndLogin(
      app,
      `document-pagination.${Date.now()}@example.com`,
    );
    const createdDocuments = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        createCompletedDocument(
          user.id,
          index,
          new Date(Date.UTC(2026, 5, 24, 0, index)),
        ),
      ),
    );
    const expectedIds = [...createdDocuments]
      .sort(
        (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
      )
      .map((document) => document.id);

    const firstResponse = await request(app.getHttpServer())
      .get('/api/v1/documents')
      .query({ limit: 5 })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const firstPage = firstResponse.body as ListDocumentsResponseBody;

    expect(firstPage.total).toBe(12);
    expect(firstPage.data).toHaveLength(5);
    expect(firstPage.nextCursor).toEqual(expect.any(String));

    const secondResponse = await request(app.getHttpServer())
      .get('/api/v1/documents')
      .query({ limit: 5, cursor: firstPage.nextCursor })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const secondPage = secondResponse.body as ListDocumentsResponseBody;

    expect(secondPage.total).toBe(12);
    expect(secondPage.data).toHaveLength(5);
    expect(secondPage.nextCursor).toEqual(expect.any(String));

    const thirdResponse = await request(app.getHttpServer())
      .get('/api/v1/documents')
      .query({ limit: 5, cursor: secondPage.nextCursor })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const thirdPage = thirdResponse.body as ListDocumentsResponseBody;

    expect(thirdPage.total).toBe(12);
    expect(thirdPage.data).toHaveLength(2);
    expect(thirdPage.nextCursor).toBeNull();

    const returnedIds = [firstPage, secondPage, thirdPage].flatMap((page) =>
      page.data.map((document) => document.id),
    );
    expect(returnedIds).toEqual(expectedIds);
    expect(new Set(returnedIds).size).toBe(12);
  });

  it('uses id descending as a deterministic tie-breaker for identical createdAt values', async () => {
    const { user, accessToken } = await registerAndLogin(
      app,
      `document-pagination-tie.${Date.now()}@example.com`,
    );
    const tiedCreatedAt = new Date('2026-06-24T12:00:00.000Z');
    const lowerIdDocument = await createCompletedDocument(
      user.id,
      1,
      tiedCreatedAt,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );
    const higherIdDocument = await createCompletedDocument(
      user.id,
      2,
      tiedCreatedAt,
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    );

    const firstResponse = await request(app.getHttpServer())
      .get('/api/v1/documents')
      .query({ limit: 1 })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const firstPage = firstResponse.body as ListDocumentsResponseBody;

    expect(firstPage.total).toBe(2);
    expect(firstPage.data.map((document) => document.id)).toEqual([
      higherIdDocument.id,
    ]);
    expect(firstPage.nextCursor).toEqual(expect.any(String));

    const secondResponse = await request(app.getHttpServer())
      .get('/api/v1/documents')
      .query({ limit: 1, cursor: firstPage.nextCursor })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const secondPage = secondResponse.body as ListDocumentsResponseBody;

    expect(secondPage.total).toBe(2);
    expect(secondPage.data.map((document) => document.id)).toEqual([
      lowerIdDocument.id,
    ]);
    expect(secondPage.nextCursor).toBeNull();
  });

  it('applies the default limit of 20 and accepts the maximum limit of 100', async () => {
    const { user, accessToken } = await registerAndLogin(
      app,
      `document-list-limits.${Date.now()}@example.com`,
    );
    await Promise.all(
      Array.from({ length: 21 }, (_, index) =>
        createCompletedDocument(
          user.id,
          index,
          new Date(Date.UTC(2026, 5, 24, 1, index)),
        ),
      ),
    );

    const defaultResponse = await request(app.getHttpServer())
      .get('/api/v1/documents')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const defaultPage = defaultResponse.body as ListDocumentsResponseBody;
    expect(defaultPage.data).toHaveLength(20);
    expect(defaultPage.nextCursor).toEqual(expect.any(String));
    expect(defaultPage.total).toBe(21);

    const maximumResponse = await request(app.getHttpServer())
      .get('/api/v1/documents')
      .query({ limit: 100 })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const maximumPage = maximumResponse.body as ListDocumentsResponseBody;
    expect(maximumPage.data).toHaveLength(21);
    expect(maximumPage.nextCursor).toBeNull();
  });

  it.each(['0', '101', '1.5', 'not-a-number'])(
    'rejects invalid list limit %s',
    async (limit) => {
      const { accessToken } = await registerAndLogin(
        app,
        `document-invalid-limit-${limit}.${Date.now()}@example.com`,
      );

      await request(app.getHttpServer())
        .get('/api/v1/documents')
        .query({ limit })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    },
  );

  it('returns 400 for malformed, stale, and non-owned cursors', async () => {
    const owner = await registerAndLogin(
      app,
      `document-cursor-owner.${Date.now()}@example.com`,
    );
    const otherUser = await registerAndLogin(
      app,
      `document-cursor-other.${Date.now()}@example.com`,
    );
    const otherDocument = await createCompletedDocument(
      otherUser.user.id,
      1,
      new Date('2026-06-24T11:00:00.000Z'),
    );
    const staleCursor = encodeCursorPayload({
      id: '44444444-4444-4444-8444-444444444444',
      createdAt: '2026-06-24T11:00:00.000Z',
    });
    const nonOwnedCursor = encodeCursorPayload({
      id: otherDocument.id,
      createdAt: otherDocument.createdAt.toISOString(),
    });

    for (const cursor of ['not-base64', staleCursor, nonOwnedCursor]) {
      await request(app.getHttpServer())
        .get('/api/v1/documents')
        .query({ cursor })
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(400)
        .expect((res: HttpResponseBody) => {
          expect(asErrorMessageBody(res.body).message).toBe(
            'Invalid document cursor',
          );
        });
    }
  });

  it('requires authentication to list documents', async () => {
    await request(app.getHttpServer()).get('/api/v1/documents').expect(401);
  });

  it('POST upload flags low-confidence analysis for manual review and exposes it on GET', async () => {
    const { accessToken } = await registerAndLogin(
      app,
      `document-low-confidence.${Date.now()}@example.com`,
    );
    analyze.mockResolvedValueOnce({
      ...successfulAnalysis,
      confidenceScore: 0.58,
    });

    const uploadResponse = await request(app.getHttpServer())
      .post('/api/v1/documents/upload')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', createValidPdfBuffer(), {
        filename: 'review.pdf',
        contentType: 'application/pdf',
      })
      .expect(201)
      .expect((res: HttpResponseBody) => {
        const body = res.body as UploadDocumentResponseBody;
        expect(body.status).toBe('DONE');
        expect(body.confidenceScore).toBe(0.58);
        expect(body.needsReview).toBe(true);
      });

    const documentId = (uploadResponse.body as UploadDocumentResponseBody).id;
    const persistedDocument = await prisma.document.findUnique({
      where: { id: documentId },
      include: { processingResult: true },
    });

    expect(persistedDocument?.processingResult).toMatchObject({
      confidenceScore: 0.58,
      needsReview: true,
      errorMessage: null,
    });

    await request(app.getHttpServer())
      .get(`/api/v1/documents/${documentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res: HttpResponseBody) => {
        const body = res.body as UploadDocumentResponseBody;
        expect(body.confidenceScore).toBe(0.58);
        expect(body.needsReview).toBe(true);
      });
  });

  it('persists FAILED and a sanitized outcome when Gemini times out', async () => {
    const { accessToken } = await registerAndLogin(
      app,
      `document-timeout.${Date.now()}@example.com`,
    );
    const timeoutError = new DocumentAnalysisTimeoutError(8_000);
    analyze.mockRejectedValueOnce(timeoutError);

    const uploadResponse = await request(app.getHttpServer())
      .post('/api/v1/documents/upload')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', createValidPdfBuffer(), {
        filename: 'timeout.pdf',
        contentType: 'application/pdf',
      })
      .expect(201)
      .expect((res: HttpResponseBody) => {
        const body = res.body as UploadDocumentResponseBody;
        expect(body.status).toBe('FAILED');
        expect(body.extractedText).toBeNull();
        expect(body.classification).toBeNull();
        expect(body.summary).toBeNull();
        expect(body.confidenceScore).toBeNull();
        expect(body.language).toBeNull();
        expect(body.needsReview).toBe(false);
        expect(body.errorMessage).toBe('LLM analysis timed out');
      });

    const documentId = (uploadResponse.body as UploadDocumentResponseBody).id;
    const persistedDocument = await prisma.document.findUnique({
      where: { id: documentId },
      include: { processingResult: true },
    });

    expect(persistedDocument?.status).toBe(DocumentStatus.FAILED);
    expect(persistedDocument?.processingResult).toMatchObject({
      extractedText: null,
      classification: null,
      summary: null,
      confidenceScore: null,
      language: null,
      needsReview: false,
      errorMessage: 'LLM analysis timed out',
    });
    expect(persistedDocument?.processingResult?.errorMessage).not.toContain(
      'raw provider',
    );

    await request(app.getHttpServer())
      .get(`/api/v1/documents/${documentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res: HttpResponseBody) => {
        const detail = res.body as DocumentDetailResponseBody;
        expect(detail.status).toBe('FAILED');
        expect(detail.errorMessage).toBe('LLM analysis timed out');
        expect(detail.downloadUrl).toEqual(expect.any(String));
      });
  });

  it.each([
    ['PNG', 'diagram.png', 'image/png', createPngBuffer()],
    [
      'DOCX',
      'contract.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      createDocxBuffer(),
    ],
  ])(
    'POST /api/v1/documents/upload accepts supported %s files',
    async (_label, filename, expectedMimeType, buffer) => {
      const email = `document-supported.${Date.now()}-${filename}@example.com`;
      const { accessToken } = await registerAndLogin(app, email);

      await request(app.getHttpServer())
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', buffer, {
          filename,
          contentType: expectedMimeType,
        })
        .expect(201)
        .expect((res: HttpResponseBody) => {
          const body = res.body as UploadDocumentResponseBody;
          expect(body.status).toBe('DONE');
          expect(body.originalName).toBe(filename);
          expect(body.mimeType).toBe(expectedMimeType);
          expect(body.sizeBytes).toBe(buffer.length);
        });
    },
  );

  it('POST /api/v1/documents/upload returns 415 for mismatched extension and magic bytes', async () => {
    const email = `document-mismatch.${Date.now()}@example.com`;
    const { accessToken } = await registerAndLogin(app, email);

    await request(app.getHttpServer())
      .post('/api/v1/documents/upload')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', createJpegBuffer(), {
        filename: 'invoice.pdf',
        contentType: 'application/pdf',
      })
      .expect(415)
      .expect((res: HttpResponseBody) => {
        expect(asErrorMessageBody(res.body).message).toBe('Invalid file type');
      });

    await expect(prisma.document.count()).resolves.toBe(0);
  });

  it('POST /api/v1/documents/upload returns 415 for unsupported formats', async () => {
    const email = `document-heic.${Date.now()}@example.com`;
    const { accessToken } = await registerAndLogin(app, email);

    await request(app.getHttpServer())
      .post('/api/v1/documents/upload')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', createHeicBuffer(), {
        filename: 'photo.heic',
        contentType: 'image/heic',
      })
      .expect(415);

    await expect(prisma.document.count()).resolves.toBe(0);
  });

  it('POST /api/v1/documents/upload returns 413 for oversized files', async () => {
    const email = `document-large.${Date.now()}@example.com`;
    const { accessToken } = await registerAndLogin(app, email);
    const oversizedPdfBuffer = Buffer.concat([
      Buffer.from('%PDF-1.4\n', 'utf8'),
      Buffer.alloc(10 * 1024 * 1024 + 1),
    ]);

    await request(app.getHttpServer())
      .post('/api/v1/documents/upload')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', oversizedPdfBuffer, {
        filename: 'large.pdf',
        contentType: 'application/pdf',
      })
      .expect(413)
      .expect((res: HttpResponseBody) => {
        expect(asErrorMessageBody(res.body).message).toBe('File too large');
      });

    await expect(prisma.document.count()).resolves.toBe(0);
  });
});
