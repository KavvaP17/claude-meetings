import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

interface UserProfileResponseBody {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

interface AuthResponseBody {
  accessToken: string;
}

function uniqueEmail(): string {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let email: string;
  let authHeader: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    email = uniqueEmail();
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'Password123!' })
      .expect(201);
    const { accessToken } = registerResponse.body as AuthResponseBody;
    authHeader = `Bearer ${accessToken}`;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /users/me', () => {
    it('returns the authenticated user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', authHeader)
        .expect(200);

      const body = response.body as UserProfileResponseBody;
      expect(typeof body.id).toBe('string');
      expect(body.email).toBe(email);
      expect(body.name).toBeNull();
      expect(body.avatarUrl).toBeNull();
      expect(typeof body.createdAt).toBe('string');
      expect(Object.keys(body)).not.toContain('password');
    });

    it('rejects a request with no Authorization header with 401', async () => {
      await request(app.getHttpServer()).get('/users/me').expect(401);
    });

    it('rejects a request with an invalid token with 401', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer not-a-valid-token')
        .expect(401);
    });
  });
});
