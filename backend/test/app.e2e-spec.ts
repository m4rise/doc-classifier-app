import { rm } from 'fs/promises';
import { join } from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DOCUMENT_ANALYZER } from './../src/documents/application/documents.tokens';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/shared/infrastructure/database/prisma.service';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('e2e', () => {
  const originalFileStorageDriver = process.env.FILE_STORAGE_DRIVER;
  const originalLocalUploadDir = process.env.LOCAL_UPLOAD_DIR;
  const uploadDir = join(process.cwd(), 'uploads', 'jest-e2e-upload');
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.FILE_STORAGE_DRIVER = 'local';
    process.env.LOCAL_UPLOAD_DIR = uploadDir;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DOCUMENT_ANALYZER)
      .useValue({
        analyze: () =>
          Promise.resolve({
            extractedText: 'Invoice #2026-001',
            classification: 'invoice',
            summary: 'Invoice for professional services.',
            confidenceScore: 0.94,
            language: 'en',
          }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
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

  describe('AppController', () => {
    it('/ (GET)', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Hello World!');
    });

    it('/ (GET) — X-Request-ID header is present and is a UUID v4', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => {
          expect(res.headers['x-request-id']).toMatch(UUID_REGEX);
        });
    });
  });

  describe('HealthController', () => {
    it('/health (GET) — returns HTTP 200 with status ok', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res: { body: unknown }) => {
          const body = res.body as { status: string };
          expect(body.status).toBe('ok');
        });
    });

    it('/health (GET) — X-Request-ID header is present and is a UUID v4', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.headers['x-request-id']).toMatch(UUID_REGEX);
        });
    });
  });

  describe('DocumentsController', () => {
    it('/api/v1/documents/upload (POST) — authenticates and uploads a valid PDF', async () => {
      const email = `e2e-upload.${Date.now()}@example.com`;
      const pdfBuffer = Buffer.from('%PDF-1.4\n%%EOF', 'utf8');

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'super-secure-password',
          tosAccepted: true,
          tosVersion: '1.0',
        })
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email,
          password: 'super-secure-password',
        })
        .expect(200);

      const accessToken = (loginResponse.body as { accessToken: string })
        .accessToken;

      await request(app.getHttpServer())
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', pdfBuffer, {
          filename: 'invoice.pdf',
          contentType: 'application/pdf',
        })
        .expect(201)
        .expect((res: { body: unknown }) => {
          const body = res.body as {
            mimeType: string;
            needsReview: boolean;
            originalName: string;
            status: string;
          };
          expect(body.status).toBe('DONE');
          expect(body.originalName).toBe('invoice.pdf');
          expect(body.mimeType).toBe('application/pdf');
          expect(body.needsReview).toBe(false);
        });
    });
  });
});
