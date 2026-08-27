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

    it('ignores a client-supplied avatarUrl (stripped by the global whitelist, not part of the DTO)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', authHeader)
        .send({ avatarUrl: '@evil.example/x.png' })
        .expect(200);

      const body = response.body as UserProfileResponseBody;
      expect(body.email).toBe(email);
      expect(body.avatarUrl).toBeNull();
    });

    it('rejects an empty-string name with 400', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', authHeader)
        .send({ name: '' })
        .expect(400);
    });

    it('rejects a request with no Authorization header with 401', async () => {
      await request(app.getHttpServer()).patch('/users/me').send({ name: 'New Name' }).expect(401);
    });
  });

  describe('POST /users/me/avatar', () => {
    it('saves the uploaded avatar file and updates avatarUrl on the profile', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/me/avatar')
        .set('Authorization', authHeader)
        .attach('avatar', Buffer.from('fake image content'), {
          filename: 'avatar.png',
          contentType: 'image/png',
        })
        .expect(201);

      const body = response.body as UserProfileResponseBody;
      expect(body.email).toBe(email);
      expect(typeof body.avatarUrl).toBe('string');
      expect(body.avatarUrl).toMatch(/^\/uploads\/.+\.png$/);

      const profileResponse = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', authHeader)
        .expect(200);
      const profileBody = profileResponse.body as UserProfileResponseBody;
      expect(profileBody.avatarUrl).toBe(body.avatarUrl);
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

    it('rejects a disallowed file format with 400', async () => {
      await request(app.getHttpServer())
        .post('/users/me/avatar')
        .set('Authorization', authHeader)
        .attach('avatar', Buffer.from('not an image'), {
          filename: 'malware.exe',
          contentType: 'application/octet-stream',
        })
        .expect(400);
    });
  });

  describe('POST /users/me/avatar - file size limit', () => {
    let previousMaxAvatarSizeBytes: string | undefined;

    beforeAll(() => {
      previousMaxAvatarSizeBytes = process.env.MAX_AVATAR_SIZE_BYTES;
      process.env.MAX_AVATAR_SIZE_BYTES = '1024';
    });

    afterAll(() => {
      restoreEnv('MAX_AVATAR_SIZE_BYTES', previousMaxAvatarSizeBytes);
    });

    it('rejects a file exceeding the configured max size', async () => {
      // multer's `limits.fileSize` (AvatarUploadInterceptor) rejects the stream before it's fully
      // read — Nest maps that to 413 Payload Too Large, not 400 (mirrors meeting-files.e2e-spec.ts).
      await request(app.getHttpServer())
        .post('/users/me/avatar')
        .set('Authorization', authHeader)
        .attach('avatar', Buffer.alloc(2048), {
          filename: 'oversized.png',
          contentType: 'image/png',
        })
        .expect(413);
    });
  });

  describe('POST /users/me/change-password', () => {
    it('changes the password when the old password is correct', async () => {
      await request(app.getHttpServer())
        .post('/users/me/change-password')
        .set('Authorization', authHeader)
        .send({ oldPassword: 'Password123!', newPassword: 'NewPassword456!' })
        .expect(200);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'NewPassword456!' })
        .expect(200);
      expect((loginResponse.body as AuthResponseBody).accessToken).toEqual(expect.any(String));
    });

    it('rejects an incorrect old password with 400', async () => {
      await request(app.getHttpServer())
        .post('/users/me/change-password')
        .set('Authorization', authHeader)
        .send({ oldPassword: 'WrongPassword!', newPassword: 'NewPassword456!' })
        .expect(400);
    });

    it('rejects a new password that does not meet the policy with 400', async () => {
      await request(app.getHttpServer())
        .post('/users/me/change-password')
        .set('Authorization', authHeader)
        .send({ oldPassword: 'Password123!', newPassword: 'short' })
        .expect(400);
    });

    it('rejects a new password that matches the old password with 400', async () => {
      await request(app.getHttpServer())
        .post('/users/me/change-password')
        .set('Authorization', authHeader)
        .send({ oldPassword: 'Password123!', newPassword: 'Password123!' })
        .expect(400);
    });

    it('rejects a request with no Authorization header with 401', async () => {
      await request(app.getHttpServer())
        .post('/users/me/change-password')
        .send({ oldPassword: 'Password123!', newPassword: 'NewPassword456!' })
        .expect(401);
    });
  });
});
