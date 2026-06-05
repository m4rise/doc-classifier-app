import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';

interface RegisterResponseBody {
  id: string;
  email: string;
  role: string;
}

interface PersistedConsentRecord {
  userId: string;
  tosVersion: string;
  acceptedAt: Date;
}

interface PersistedUserWithConsent {
  id: string;
  passwordHash: string;
  consentRecords: PersistedConsentRecord[];
}

interface HttpResponseBody {
  body: unknown;
}

function asErrorMessageBody(value: unknown): { message?: unknown } {
  if (typeof value === 'object' && value !== null) {
    return value;
  }

  return {};
}

function asPersistedUserWithConsent(
  value: unknown,
): PersistedUserWithConsent | null {
  if (value === null) {
    return null;
  }

  return value as PersistedUserWithConsent;
}

describe('AuthController integration', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.consentRecord.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('POST /api/v1/auth/register returns 201 and creates consent record', async () => {
    const email = `john.${Date.now()}@example.com`;

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'super-secure-password',
        tosAccepted: true,
        tosVersion: '1.0',
      })
      .expect(201)
      .expect((res: HttpResponseBody) => {
        const body = res.body as RegisterResponseBody;
        expect(typeof body.id).toBe('string');
        expect(body.email).toBe(email);
        expect(body.role).toBe('USER');
        expect(res.body).not.toHaveProperty('passwordHash');
      });

    const persisted = asPersistedUserWithConsent(
      await prisma.user.findUnique({
        where: { email },
        include: { consentRecords: true },
      }),
    );

    expect(persisted).not.toBeNull();
    expect(persisted?.passwordHash.startsWith('$argon2id$')).toBe(true);
    expect(persisted?.consentRecords).toHaveLength(1);
    expect(persisted?.consentRecords[0]).toMatchObject({
      userId: persisted?.id,
      tosVersion: '1.0',
    });
    expect(persisted?.consentRecords[0].acceptedAt).toBeInstanceOf(Date);
  });

  it('POST /api/v1/auth/register returns 409 when email already exists', async () => {
    const email = `dup.${Date.now()}@example.com`;

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'super-secure-password',
        tosAccepted: true,
        tosVersion: '1.0',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'super-secure-password',
        tosAccepted: true,
        tosVersion: '1.0',
      })
      .expect(409)
      .expect((res: HttpResponseBody) => {
        expect(asErrorMessageBody(res.body).message).toBe(
          'Email already in use',
        );
      });
  });

  it('POST /api/v1/auth/register returns 400 when tosAccepted is false', async () => {
    const email = `noconsent.${Date.now()}@example.com`;

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'super-secure-password',
        tosAccepted: false,
        tosVersion: '1.0',
      })
      .expect(400)
      .expect((res: HttpResponseBody) => {
        expect(asErrorMessageBody(res.body).message).toBe(
          'ToS consent is required',
        );
      });
  });
});
