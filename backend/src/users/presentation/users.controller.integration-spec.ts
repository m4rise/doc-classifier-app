import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { Role } from '../../generated/prisma';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import { asErrorMessageBody } from '../../../test/integration-http.helpers';
import type {
  HttpResponseBody,
  LoginResponseBody,
  RegisterResponseBody,
} from '../../../test/integration-http.helpers';

interface UserProfileResponseBody {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  passwordHash?: string;
}

let forwardedIpHost = 50;

function nextForwardedIp(): string {
  forwardedIpHost += 1;
  return `198.51.100.${forwardedIpHost}`;
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

async function login(
  app: NestExpressApplication,
  email: string,
): Promise<string> {
  const loginResponse = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('X-Forwarded-For', nextForwardedIp())
    .send({
      email,
      password: 'super-secure-password',
    })
    .expect(200);

  return (loginResponse.body as LoginResponseBody).accessToken;
}

describe('UsersController integration', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.set('trust proxy', 1);
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

  it('GET /api/v1/users returns 403 for a USER role JWT', async () => {
    const email = `users-admin-denied.${Date.now()}@example.com`;
    const { accessToken } = await registerAndLogin(app, email);

    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });

  it('GET /api/v1/users returns user profiles for an ADMIN role JWT', async () => {
    const adminEmail = `users-admin.${Date.now()}@example.com`;
    const userEmail = `users-listed.${Date.now()}@example.com`;
    const { user: admin } = await registerAndLogin(app, adminEmail);
    const { user } = await registerAndLogin(app, userEmail);

    await prisma.user.update({
      where: { id: admin.id },
      data: { role: Role.ADMIN },
    });
    const adminToken = await login(app, adminEmail);

    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res: HttpResponseBody) => {
        expect(Array.isArray(res.body)).toBe(true);
        const body = res.body as UserProfileResponseBody[];
        expect(body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: admin.id,
              email: adminEmail,
              role: 'ADMIN',
            }),
            expect.objectContaining({
              id: user.id,
              email: userEmail,
              role: 'USER',
            }),
          ]),
        );
        expect(body[0]).not.toHaveProperty('passwordHash');
      });
  });

  it('GET /api/v1/users denies a stale ADMIN token after role demotion', async () => {
    const email = `users-demoted-admin.${Date.now()}@example.com`;
    const { user } = await registerAndLogin(app, email);

    await prisma.user.update({
      where: { id: user.id },
      data: { role: Role.ADMIN },
    });
    const adminToken = await login(app, email);

    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await prisma.user.update({
      where: { id: user.id },
      data: { role: Role.USER },
    });

    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);
  });
});
