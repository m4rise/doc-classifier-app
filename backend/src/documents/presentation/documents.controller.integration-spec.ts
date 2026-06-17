import { rm, stat } from 'fs/promises';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../app.module';
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

  beforeAll(async () => {
    process.env.FILE_STORAGE_DRIVER = 'local';
    process.env.LOCAL_UPLOAD_DIR = uploadDir;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.set('trust proxy', 1);
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
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

  it('POST /api/v1/documents/upload returns 202 and creates a PENDING document', async () => {
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
      .expect(202)
      .expect((res: HttpResponseBody) => {
        const body = res.body as UploadDocumentResponseBody;
        expect(body.id).toEqual(expect.any(String));
        expect(body.status).toBe('PENDING');
        expect(body.originalName).toBe('invoice.pdf');
        expect(body.mimeType).toBe('application/pdf');
        expect(body.sizeBytes).toBe(pdfBuffer.length);
      });

    const body = uploadResponse.body as UploadDocumentResponseBody;
    const persistedDocument = await prisma.document.findUnique({
      where: { id: body.id },
    });

    expect(persistedDocument).toMatchObject({
      id: body.id,
      userId: user.id,
      originalName: 'invoice.pdf',
      mimeType: 'application/pdf',
      sizeBytes: pdfBuffer.length,
      status: DocumentStatus.PENDING,
    });
    expect(persistedDocument?.storageKey).toMatch(uuidPattern);
    expect(persistedDocument?.storageKey).not.toBe('invoice.pdf');
    await expect(
      stat(join(uploadDir, persistedDocument?.storageKey ?? 'missing')),
    ).resolves.toMatchObject({
      size: pdfBuffer.length,
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
        .expect(202)
        .expect((res: HttpResponseBody) => {
          const body = res.body as UploadDocumentResponseBody;
          expect(body.status).toBe('PENDING');
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
