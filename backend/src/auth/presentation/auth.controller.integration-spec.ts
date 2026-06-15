import { JwtService } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { resolveJwtRefreshSecret } from '../infrastructure/security/jwt-refresh-secret';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';

interface RegisterResponseBody {
  id: string;
  email: string;
  role: string;
}

interface LoginResponseBody {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface RefreshTokenResponseBody {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthenticatedUserResponseBody {
  userId: string;
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

let forwardedIpHost = 1;

function nextForwardedIp(): string {
  forwardedIpHost += 1;
  return `198.51.100.${forwardedIpHost}`;
}

describe('AuthController integration', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.set('trust proxy', true);
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

  it('POST /api/v1/auth/register returns 201 and creates consent record', async () => {
    const email = `john.${Date.now()}@example.com`;
    const ip = nextForwardedIp();

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set('X-Forwarded-For', ip)
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
    const ip = nextForwardedIp();

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set('X-Forwarded-For', ip)
      .send({
        email,
        password: 'super-secure-password',
        tosAccepted: true,
        tosVersion: '1.0',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set('X-Forwarded-For', ip)
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
    const ip = nextForwardedIp();

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set('X-Forwarded-For', ip)
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

  it('POST /api/v1/auth/login returns 200 with a JWT access token', async () => {
    const email = `login.${Date.now()}@example.com`;
    const ip = nextForwardedIp();

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set('X-Forwarded-For', ip)
      .send({
        email,
        password: 'super-secure-password',
        tosAccepted: true,
        tosVersion: '1.0',
      });

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', ip)
      .send({
        email,
        password: 'super-secure-password',
      })
      .expect(200)
      .expect((res: HttpResponseBody) => {
        const body = res.body as LoginResponseBody;
        expect(typeof body.accessToken).toBe('string');
        expect(body.accessToken.split('.')).toHaveLength(3);
        expect(typeof body.refreshToken).toBe('string');
        expect(body.refreshToken.split('.')).toHaveLength(3);
        expect(body.expiresIn).toBe(900);
      });

    const persistedUser = await prisma.user.findUnique({
      where: { email },
      include: { refreshTokens: true },
    });

    expect(persistedUser?.refreshTokens).toHaveLength(1);
    expect(persistedUser?.refreshTokens[0].jti).toEqual(expect.any(String));
    expect(
      persistedUser?.refreshTokens[0].tokenHash.startsWith('$argon2id$'),
    ).toBe(true);
  });

  it('POST /api/v1/auth/refresh rotates refresh token and rejects old token reuse', async () => {
    const email = `refresh.${Date.now()}@example.com`;
    const ip = nextForwardedIp();

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set('X-Forwarded-For', ip)
      .send({
        email,
        password: 'super-secure-password',
        tosAccepted: true,
        tosVersion: '1.0',
      });

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', ip)
      .send({
        email,
        password: 'super-secure-password',
      })
      .expect(200);
    const oldRefreshToken = (loginResponse.body as LoginResponseBody)
      .refreshToken;

    const refreshResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Authorization', `Bearer ${oldRefreshToken}`)
      .expect(200)
      .expect((res: HttpResponseBody) => {
        const body = res.body as RefreshTokenResponseBody;
        expect(typeof body.accessToken).toBe('string');
        expect(body.accessToken.split('.')).toHaveLength(3);
        expect(typeof body.refreshToken).toBe('string');
        expect(body.refreshToken.split('.')).toHaveLength(3);
        expect(body.refreshToken).not.toBe(oldRefreshToken);
        expect(body.expiresIn).toBe(900);
      });

    const persistedUser = await prisma.user.findUnique({
      where: { email },
      include: { refreshTokens: { orderBy: { createdAt: 'asc' } } },
    });

    expect(persistedUser?.refreshTokens).toHaveLength(2);
    expect(persistedUser?.refreshTokens[0].revokedAt).toBeInstanceOf(Date);
    expect(persistedUser?.refreshTokens[1].revokedAt).toBeNull();

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Authorization', `Bearer ${oldRefreshToken}`)
      .expect(401)
      .expect((res: HttpResponseBody) => {
        expect(asErrorMessageBody(res.body).message).toBe(
          'Invalid refresh token',
        );
      });

    const newRefreshToken = (refreshResponse.body as RefreshTokenResponseBody)
      .refreshToken;

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Authorization', `Bearer ${newRefreshToken}`)
      .expect(401);
  });

  it('POST /api/v1/auth/logout revokes active refresh tokens and prevents refresh', async () => {
    const email = `logout.${Date.now()}@example.com`;
    const ip = nextForwardedIp();

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set('X-Forwarded-For', ip)
      .send({
        email,
        password: 'super-secure-password',
        tosAccepted: true,
        tosVersion: '1.0',
      });

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', ip)
      .send({
        email,
        password: 'super-secure-password',
      })
      .expect(200);
    const body = loginResponse.body as LoginResponseBody;

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .expect(200)
      .expect((res: HttpResponseBody) => {
        expect(res.body).toEqual({});
      });

    const persistedUser = await prisma.user.findUnique({
      where: { email },
      include: { refreshTokens: true },
    });

    expect(persistedUser?.refreshTokens).toHaveLength(1);
    expect(persistedUser?.refreshTokens[0].revokedAt).toBeInstanceOf(Date);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Authorization', `Bearer ${body.refreshToken}`)
      .expect(401)
      .expect((res: HttpResponseBody) => {
        expect(asErrorMessageBody(res.body).message).toBe(
          'Invalid refresh token',
        );
      });
  });

  it('POST /api/v1/auth/logout returns 401 without a valid access token', async () => {
    await request(app.getHttpServer()).post('/api/v1/auth/logout').expect(401);
  });

  it('POST /api/v1/auth/refresh returns 401 Refresh token expired when token is expired', async () => {
    const jwtService = app.get(JwtService);
    const expiredRefreshToken = jwtService.sign(
      {
        sub: 'expired-user',
        email: 'expired@example.com',
        role: 'USER',
        jti: 'expired-jti',
      },
      { secret: resolveJwtRefreshSecret(), expiresIn: '-1s' },
    );

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Authorization', `Bearer ${expiredRefreshToken}`)
      .expect(401)
      .expect((res: HttpResponseBody) => {
        expect(asErrorMessageBody(res.body).message).toBe(
          'Refresh token expired',
        );
      });
  });

  it('POST /api/v1/auth/login returns 401 when password is wrong', async () => {
    const email = `wrong-password.${Date.now()}@example.com`;
    const ip = nextForwardedIp();

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set('X-Forwarded-For', ip)
      .send({
        email,
        password: 'super-secure-password',
        tosAccepted: true,
        tosVersion: '1.0',
      });

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', ip)
      .send({
        email,
        password: 'wrong-password',
      })
      .expect(401)
      .expect((res: HttpResponseBody) => {
        expect(asErrorMessageBody(res.body).message).toBe(
          'Invalid credentials',
        );
      });
  });

  it('POST /api/v1/auth/login returns 429 on the 11th attempt from the same IP', async () => {
    const email = `throttle.${Date.now()}@example.com`;
    const registerIp = nextForwardedIp();
    const loginIp = nextForwardedIp();

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set('X-Forwarded-For', registerIp)
      .send({
        email,
        password: 'super-secure-password',
        tosAccepted: true,
        tosVersion: '1.0',
      })
      .expect(201);

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', loginIp)
        .send({
          email,
          password: 'wrong-password',
        })
        .expect(401);
    }

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', loginIp)
      .send({
        email,
        password: 'wrong-password',
      })
      .expect(429)
      .expect((res: HttpResponseBody) => {
        expect(asErrorMessageBody(res.body).message).toBe('Too Many Requests');
      });
  });

  it('GET /api/v1/auth/me returns req.user from a valid JWT access token', async () => {
    const email = `me.${Date.now()}@example.com`;
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
    const token = (loginResponse.body as LoginResponseBody).accessToken;

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res: HttpResponseBody) => {
        const body = res.body as AuthenticatedUserResponseBody;
        expect(body).toEqual({
          userId: (registerResponse.body as RegisterResponseBody).id,
          email,
          role: 'USER',
        });
      });
  });

  it('GET /api/v1/auth/me returns 401 when access token is invalid', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('GET /api/v1/auth/me returns 401 Token expired when access token is expired', async () => {
    const jwtService = app.get(JwtService);
    const expiredToken = jwtService.sign(
      {
        sub: 'expired-user',
        email: 'expired@example.com',
        role: 'USER',
      },
      { expiresIn: '-1s' },
    );

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401)
      .expect((res: HttpResponseBody) => {
        expect(asErrorMessageBody(res.body).message).toBe('Token expired');
      });
  });
});
