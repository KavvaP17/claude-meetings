import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

interface MeetingResponseBody {
  id: string;
  creatorId: string;
  files: MeetingFileResponseBody[];
}

interface MeetingFileResponseBody {
  id: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  status: string;
  createdAt: string;
  uploadedById: string;
}

interface AuthResponseBody {
  accessToken: string;
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

function uniqueEmail(): string {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function registerUser(app: INestApplication<App>): Promise<{ authHeader: string }> {
  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email: uniqueEmail(), password: 'Password123!' })
    .expect(201);
  const { accessToken } = response.body as AuthResponseBody;
  return { authHeader: `Bearer ${accessToken}` };
}

async function createMeeting(
  app: INestApplication<App>,
  authHeader: string,
): Promise<MeetingResponseBody> {
  const response = await request(app.getHttpServer())
    .post('/meetings')
    .set('Authorization', authHeader)
    .send({
      title: `Team sync ${Date.now()}-${Math.random().toString(36).slice(2)}`,
      date: new Date().toISOString(),
      participants: [],
    })
    .expect(201);
  return response.body as MeetingResponseBody;
}

describe('Meeting files (e2e)', () => {
  let app: INestApplication<App>;
  let storageDir: string;
  let previousStorageDir: string | undefined;

  beforeAll(() => {
    previousStorageDir = process.env.STORAGE_DIR;
    storageDir = mkdtempSync(join(tmpdir(), 'meeting-files-e2e-'));
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
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /meetings/:id/files', () => {
    it('rejects an unauthenticated request with 401', async () => {
      await request(app.getHttpServer())
        .post(`/meetings/${randomUUID()}/files`)
        .attach('file', Buffer.from('fake audio'), {
          filename: 'recording.mp3',
          contentType: 'audio/mpeg',
        })
        .expect(401);
    });

    it('returns 404 when the meeting does not exist, and does not leave the file on disk', async () => {
      const { authHeader } = await registerUser(app);

      await request(app.getHttpServer())
        .post(`/meetings/${randomUUID()}/files`)
        .set('Authorization', authHeader)
        .attach('file', Buffer.from('fake audio'), {
          filename: 'recording.mp3',
          contentType: 'audio/mpeg',
        })
        .expect(404);

      expect(readdirSync(storageDir)).toEqual([]);
    });

    it('returns 403 when the requester is not the meeting creator, and does not leave the file on disk', async () => {
      const creator = await registerUser(app);
      const meeting = await createMeeting(app, creator.authHeader);
      const otherUser = await registerUser(app);

      await request(app.getHttpServer())
        .post(`/meetings/${meeting.id}/files`)
        .set('Authorization', otherUser.authHeader)
        .attach('file', Buffer.from('fake audio'), {
          filename: 'recording.mp3',
          contentType: 'audio/mpeg',
        })
        .expect(403);

      expect(readdirSync(storageDir)).toEqual([]);
    });

    it('uploads a file for the meeting creator and returns metadata without storagePath', async () => {
      const creator = await registerUser(app);
      const meeting = await createMeeting(app, creator.authHeader);

      const response = await request(app.getHttpServer())
        .post(`/meetings/${meeting.id}/files`)
        .set('Authorization', creator.authHeader)
        .attach('file', Buffer.from('fake audio content'), {
          filename: 'recording.mp3',
          contentType: 'audio/mpeg',
        })
        .expect(201);

      const body = response.body as MeetingFileResponseBody;
      expect(typeof body.id).toBe('string');
      expect(body.fileName).toBe('recording.mp3');
      expect(body.mimeType).toBe('audio/mpeg');
      expect(body.status).toBe('UPLOADED');
      expect(body.uploadedById).toBeDefined();
      expect(Object.keys(body)).not.toContain('storagePath');
    });

    it('rejects a disallowed file format with 400', async () => {
      const creator = await registerUser(app);
      const meeting = await createMeeting(app, creator.authHeader);

      await request(app.getHttpServer())
        .post(`/meetings/${meeting.id}/files`)
        .set('Authorization', creator.authHeader)
        .attach('file', Buffer.from('not audio'), {
          filename: 'malware.exe',
          contentType: 'application/octet-stream',
        })
        .expect(400);
    });

    it('creates independent records for multiple files uploaded to the same meeting', async () => {
      const creator = await registerUser(app);
      const meeting = await createMeeting(app, creator.authHeader);

      const first = await request(app.getHttpServer())
        .post(`/meetings/${meeting.id}/files`)
        .set('Authorization', creator.authHeader)
        .attach('file', Buffer.from('fake audio content one'), {
          filename: 'recording-1.mp3',
          contentType: 'audio/mpeg',
        })
        .expect(201);

      const second = await request(app.getHttpServer())
        .post(`/meetings/${meeting.id}/files`)
        .set('Authorization', creator.authHeader)
        .attach('file', Buffer.from('fake audio content two'), {
          filename: 'recording-2.mp3',
          contentType: 'audio/mpeg',
        })
        .expect(201);

      const firstBody = first.body as MeetingFileResponseBody;
      const secondBody = second.body as MeetingFileResponseBody;
      expect(firstBody.id).not.toBe(secondBody.id);

      const response = await request(app.getHttpServer())
        .get(`/meetings/${meeting.id}`)
        .set('Authorization', creator.authHeader)
        .expect(200);

      const body = response.body as MeetingResponseBody;
      expect(body.files).toHaveLength(2);
      expect(body.files.map((file) => file.fileName).sort()).toEqual([
        'recording-1.mp3',
        'recording-2.mp3',
      ]);
    });
  });

  describe('POST /meetings/:id/files - file size limit', () => {
    let previousMaxFileSizeBytes: string | undefined;

    beforeAll(() => {
      previousMaxFileSizeBytes = process.env.MAX_FILE_SIZE_BYTES;
      process.env.MAX_FILE_SIZE_BYTES = '1024';
    });

    afterAll(() => {
      restoreEnv('MAX_FILE_SIZE_BYTES', previousMaxFileSizeBytes);
    });

    it('rejects a file exceeding the configured max size', async () => {
      const creator = await registerUser(app);
      const meeting = await createMeeting(app, creator.authHeader);

      // multer's `limits.fileSize` (the barrier Фаза 2 built) rejects the stream before it's fully
      // read — Nest maps that to 413 Payload Too Large, not 400 (see files.module.ts / research doc §2).
      await request(app.getHttpServer())
        .post(`/meetings/${meeting.id}/files`)
        .set('Authorization', creator.authHeader)
        .attach('file', Buffer.alloc(2048), {
          filename: 'oversized.mp3',
          contentType: 'audio/mpeg',
        })
        .expect(413);
    });
  });

  describe('GET /meetings/:id with files', () => {
    it('includes creatorId and the list of uploaded files', async () => {
      const creator = await registerUser(app);
      const meeting = await createMeeting(app, creator.authHeader);

      await request(app.getHttpServer())
        .post(`/meetings/${meeting.id}/files`)
        .set('Authorization', creator.authHeader)
        .attach('file', Buffer.from('fake audio content'), {
          filename: 'recording.mp3',
          contentType: 'audio/mpeg',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/meetings/${meeting.id}`)
        .set('Authorization', creator.authHeader)
        .expect(200);

      const body = response.body as MeetingResponseBody;
      expect(body.creatorId).toBeDefined();
      expect(body.files).toHaveLength(1);
      expect(body.files[0].fileName).toBe('recording.mp3');
    });

    it('returns an empty files array when no files have been uploaded', async () => {
      const creator = await registerUser(app);
      const meeting = await createMeeting(app, creator.authHeader);

      const response = await request(app.getHttpServer())
        .get(`/meetings/${meeting.id}`)
        .set('Authorization', creator.authHeader)
        .expect(200);

      const body = response.body as MeetingResponseBody;
      expect(body.files).toEqual([]);
    });
  });
});
