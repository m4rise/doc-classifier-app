import { rm, stat } from 'fs/promises';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { DOCUMENT_ANALYZER } from '../application/documents.tokens';
import { DocumentAnalysisTimeoutError } from '../application/errors/document-analysis.errors';
import { DocumentStatus } from '../../generated/prisma';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';

interface RegisterResponseBody {
  id: string;
}

interface LoginResponseBody {
  accessToken: string;
}

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

interface HttpResponseBody {
  body: unknown;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let forwardedIpHost = 100;

function nextForwardedIp(): string {
  forwardedIpHost += 1;
  return `198.51.100.${forwardedIpHost}`;
}

function asErrorMessageBody(value: unknown): { message?: unknown } {
  if (typeof value === 'object' && value !== null) {
    return value;
  }

  return {};
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
  let prisma: PrismaService;
  const successfulAnalysis = {
    extractedText: 'Invoice #2026-001',
    classification: 'invoice',
    summary: 'Invoice for professional services.',
    confidenceScore: 0.94,
    language: 'en',
  };
  const analyze = jest.fn(() => Promise.resolve(successfulAnalysis));

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
    prisma = app.get(PrismaService);
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
        expect(res.body).toEqual(body);
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
