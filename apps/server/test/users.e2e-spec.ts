import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import type { UserProfileResponseDto } from '../src/users/dto/user-profile-response.dto';

// createdAt is serialized to a string over the wire, unlike the service-layer DTO's `Date`.
type UserProfileResponseBody = Omit<UserProfileResponseDto, 'createdAt'> & { createdAt: string };

interface AuthResponseBody {
  accessToken: string;
}

function uniqueEmail(): string {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

// `process.env.KEY = undefined` sets the literal string "undefined" (env values are always
// strings), not an unset key — must delete instead when there was no previous value.
function restoreEnv(key: string, previousValue: string | undefined): void {
  if (previousValue === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = previousValue;
  }
}

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let email: string;
  let authHeader: string;
  let storageDir: string;
  let previousStorageDir: string | undefined;

  beforeAll(() => {
    previousStorageDir = process.env.STORAGE_DIR;
    storageDir = mkdtempSync(join(tmpdir(), 'users-e2e-'));
    process.env.STORAGE_DIR = storageDir;
  });

  afterAll(() => {
    restoreEnv('STORAGE_DIR', previousStorageDir);
    rmSync(storageDir, { recursive: true, force: true });
  });

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

  describe('PATCH /users/me', () => {
    it('updates the authenticated user name and returns the updated profile', async () => {
      const response = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', authHeader)
        .send({ name: 'New Name' })
        .expect(200);

      const body = response.body as UserProfileResponseBody;
      expect(body.email).toBe(email);
      expect(body.name).toBe('New Name');
    });

    it('updates the authenticated user avatarUrl and returns the updated profile', async () => {
      const response = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', authHeader)
        .send({ avatarUrl: '/uploads/avatar.png' })
        .expect(200);

      const body = response.body as UserProfileResponseBody;
      expect(body.email).toBe(email);
      expect(body.avatarUrl).toBe('/uploads/avatar.png');
    });

    it('rejects an empty-string name with 400', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', authHeader)
        .send({ name: '' })
        .expect(400);
    });

    it('rejects a non-string avatarUrl with 400', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', authHeader)
        .send({ avatarUrl: 123 })
        .expect(400);
    });

    it('rejects a request with no Authorization header with 401', async () => {
      await request(app.getHttpServer()).patch('/users/me').send({ name: 'New Name' }).expect(401);
    });
  });

  describe('POST /users/me/avatar', () => {
    it('saves the uploaded avatar file to disk', async () => {
      await request(app.getHttpServer())
        .post('/users/me/avatar')
        .set('Authorization', authHeader)
        .attach('avatar', Buffer.from('fake image content'), {
          filename: 'avatar.png',
          contentType: 'image/png',
        })
        .expect(201);
    });

    it('rejects a request with no Authorization header with 401', async () => {
      await request(app.getHttpServer())
        .post('/users/me/avatar')
        .attach('avatar', Buffer.from('fake image content'), {
          filename: 'avatar.png',
          contentType: 'image/png',
        })
        .expect(401);
    });
  });
});
