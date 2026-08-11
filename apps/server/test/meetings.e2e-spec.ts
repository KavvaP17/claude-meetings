import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

interface MeetingResponseBody {
  id: string;
  title: string;
  date: string;
  participants: string[];
}

interface CreateMeetingPayload {
  title: string;
  date: string;
  participants: string[];
}

function buildMeetingPayload(overrides: Partial<CreateMeetingPayload> = {}): CreateMeetingPayload {
  return {
    title: `Team sync ${Date.now()}-${Math.random().toString(36).slice(2)}`,
    date: new Date().toISOString(),
    participants: ['alice@example.com', 'bob@example.com'],
    ...overrides,
  };
}

describe('Meetings (e2e)', () => {
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

  describe('POST /meetings', () => {
    it('creates a new meeting and returns it', async () => {
      const payload = buildMeetingPayload();

      const response = await request(app.getHttpServer())
        .post('/meetings')
        .send(payload)
        .expect(201);

      const body = response.body as MeetingResponseBody;
      expect(typeof body.id).toBe('string');
      expect(body.title).toBe(payload.title);
      expect(new Date(body.date).toISOString()).toBe(new Date(payload.date).toISOString());
      expect(body.participants).toEqual(payload.participants);
    });

    it('accepts an empty participants list', async () => {
      const payload = buildMeetingPayload({ participants: [] });

      const response = await request(app.getHttpServer())
        .post('/meetings')
        .send(payload)
        .expect(201);

      const body = response.body as MeetingResponseBody;
      expect(body.participants).toEqual([]);
    });

    it('rejects a missing title with 400 Bad Request', async () => {
      const { date, participants } = buildMeetingPayload();

      await request(app.getHttpServer()).post('/meetings').send({ date, participants }).expect(400);
    });

    it('rejects a missing date with 400 Bad Request', async () => {
      const { title, participants } = buildMeetingPayload();

      await request(app.getHttpServer())
        .post('/meetings')
        .send({ title, participants })
        .expect(400);
    });

    it('rejects an invalid date with 400 Bad Request', async () => {
      const payload = buildMeetingPayload({ date: 'not-a-date' });

      await request(app.getHttpServer()).post('/meetings').send(payload).expect(400);
    });

    it('rejects a missing participants field with 400 Bad Request', async () => {
      const { title, date } = buildMeetingPayload();

      await request(app.getHttpServer()).post('/meetings').send({ title, date }).expect(400);
    });

    it('rejects participants that is not an array with 400 Bad Request', async () => {
      const payload = { ...buildMeetingPayload(), participants: 'alice@example.com' };

      await request(app.getHttpServer()).post('/meetings').send(payload).expect(400);
    });

    it('rejects a participants array containing non-string values with 400 Bad Request', async () => {
      const payload = { ...buildMeetingPayload(), participants: [123, 456] };

      await request(app.getHttpServer()).post('/meetings').send(payload).expect(400);
    });
  });

  describe('GET /meetings', () => {
    it('returns a list containing previously created meetings', async () => {
      const payload = buildMeetingPayload();
      const created = await request(app.getHttpServer())
        .post('/meetings')
        .send(payload)
        .expect(201);
      const createdBody = created.body as MeetingResponseBody;

      const response = await request(app.getHttpServer()).get('/meetings').expect(200);

      const meetings = response.body as MeetingResponseBody[];
      expect(Array.isArray(meetings)).toBe(true);

      const found = meetings.find((meeting) => meeting.id === createdBody.id);
      expect(found).toMatchObject({
        id: createdBody.id,
        title: payload.title,
        participants: payload.participants,
      });
    });
  });

  describe('GET /meetings/:id', () => {
    it('returns the meeting matching the given id', async () => {
      const payload = buildMeetingPayload();
      const created = await request(app.getHttpServer())
        .post('/meetings')
        .send(payload)
        .expect(201);
      const createdBody = created.body as MeetingResponseBody;

      const response = await request(app.getHttpServer())
        .get(`/meetings/${createdBody.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: createdBody.id,
        title: payload.title,
        participants: payload.participants,
      });
    });

    it('returns 404 Not Found for a non-existent id', async () => {
      await request(app.getHttpServer()).get(`/meetings/${randomUUID()}`).expect(404);
    });
  });
});
