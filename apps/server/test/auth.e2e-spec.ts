import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

interface AuthResponseBody {
  accessToken: string;
  password?: string;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const payload = token.split('.')[1];
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
}

function uniqueEmail(): string {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('creates a new user and returns an access token', async () => {
      const email = uniqueEmail();
      const password = 'Password123!';

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password })
        .expect(201);

      const body = response.body as AuthResponseBody;
      expect(Object.keys(body)).toEqual(['accessToken']);
      expect(typeof body.accessToken).toBe('string');

      const payload = decodeJwtPayload(body.accessToken);
      expect(payload).toMatchObject({ email });
      expect(payload.sub).toBeDefined();
    });

    it('never returns the password in the response body', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: uniqueEmail(), password: 'Password123!' })
        .expect(201);

      const body = response.body as AuthResponseBody;
      expect(JSON.stringify(body)).not.toContain('Password123!');
      expect(body.password).toBeUndefined();
    });

    it('allows the newly registered user to log in with the same credentials', async () => {
      const email = uniqueEmail();
      const password = 'Password123!';

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password })
        .expect(201);

      await request(app.getHttpServer()).post('/auth/login').send({ email, password }).expect(200);
    });

    it('rejects a duplicate email with 409 Conflict', async () => {
      const email = uniqueEmail();
      const password = 'Password123!';

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password })
        .expect(409);
    });

    it('rejects an invalid email with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', password: 'Password123!' })
        .expect(400);
    });

    it('rejects a password that is too short with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: uniqueEmail(), password: 'short' })
        .expect(400);
    });

    it('rejects a missing email with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ password: 'Password123!' })
        .expect(400);
    });

    it('rejects a missing password with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: uniqueEmail() })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    const password = 'Password123!';
    let email: string;

    beforeEach(async () => {
      email = uniqueEmail();
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password })
        .expect(201);
    });

    it('logs in with correct credentials and returns an access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(200);

      const body = response.body as AuthResponseBody;
      expect(Object.keys(body)).toEqual(['accessToken']);
      expect(typeof body.accessToken).toBe('string');

      const payload = decodeJwtPayload(body.accessToken);
      expect(payload).toMatchObject({ email });
      expect(payload.sub).toBeDefined();
    });

    it('rejects an incorrect password with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'WrongPassword1!' })
        .expect(401);
    });

    it('rejects a non-existent email with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: uniqueEmail(), password })
        .expect(401);
    });

    it('rejects a missing email with 400 Bad Request', async () => {
      await request(app.getHttpServer()).post('/auth/login').send({ password }).expect(400);
    });

    it('rejects a missing password with 400 Bad Request', async () => {
      await request(app.getHttpServer()).post('/auth/login').send({ email }).expect(400);
    });
  });
});
