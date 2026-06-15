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

interface LoginResponseBody {
  accessToken: string;
}

interface UserProfileResponseBody {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  passwordHash?: string;
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

async function registerAndLogin(
  app: INestApplication<App>,
  email: string,
): Promise<{ user: RegisterResponseBody; accessToken: string }> {
  const registerResponse = await request(app.getHttpServer())
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

  return {
    user: registerResponse.body as RegisterResponseBody,
    accessToken: (loginResponse.body as LoginResponseBody).accessToken,
  };
}

describe('UsersController integration', () => {
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
    await prisma.refreshToken.deleteMany();
    await prisma.consentRecord.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('GET /api/v1/users/me returns the authenticated user profile without passwordHash', async () => {
    const email = `profile.${Date.now()}@example.com`;
    const { user, accessToken } = await registerAndLogin(app, email);

    await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res: HttpResponseBody) => {
        const body = res.body as UserProfileResponseBody;
        expect(body.id).toBe(user.id);
        expect(body.email).toBe(email);
        expect(body.role).toBe('USER');
        expect(typeof body.createdAt).toBe('string');
        expect(body).not.toHaveProperty('passwordHash');
      });
  });

  it('PATCH /api/v1/users/me updates the authenticated user email', async () => {
    const email = `profile-update.${Date.now()}@example.com`;
    const newEmail = `profile-updated.${Date.now()}@example.com`;
    const { user, accessToken } = await registerAndLogin(app, email);

    await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: newEmail })
      .expect(200)
      .expect((res: HttpResponseBody) => {
        const body = res.body as UserProfileResponseBody;
        expect(body.id).toBe(user.id);
        expect(body.email).toBe(newEmail);
        expect(body.role).toBe('USER');
        expect(body).not.toHaveProperty('passwordHash');
      });

    const persisted = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true },
    });

    expect(persisted?.email).toBe(newEmail);
  });

  it('PATCH /api/v1/users/me returns 409 when the email belongs to another user', async () => {
    const email = `profile-conflict.${Date.now()}@example.com`;
    const takenEmail = `profile-taken.${Date.now()}@example.com`;
    const { accessToken } = await registerAndLogin(app, email);
    await registerAndLogin(app, takenEmail);

    await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: takenEmail })
      .expect(409)
      .expect((res: HttpResponseBody) => {
        expect(asErrorMessageBody(res.body).message).toBe(
          'Email already in use',
        );
      });
  });

  it('GET and PATCH /api/v1/users/me return 401 without a valid JWT', async () => {
    await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);

    await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .send({ email: 'new@example.com' })
      .expect(401);
  });
});
