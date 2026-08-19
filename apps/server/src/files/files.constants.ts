import { resolve } from 'node:path';
import { ConfigService } from '@nestjs/config';

function parseList(value: string | undefined, defaults: string[]): string[] {
  return value ? value.split(',').map((entry) => entry.trim()) : defaults;
}

/** mp3, wav, m4a, mp4 per PRD; overridable via env if more formats are added later. */
export const ALLOWED_MIME_TYPES = parseList(process.env.ALLOWED_MIME_TYPES, [
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/x-m4a',
  'audio/mp4',
  'video/mp4',
]);

export const ALLOWED_EXTENSIONS = parseList(process.env.ALLOWED_EXTENSIONS, [
  '.mp3',
  '.wav',
  '.m4a',
  '.mp4',
]);

/** Defaults to 500 MB. MeetingFile.sizeBytes is Postgres `Int` (max ~2.1 GB) — stay well under that. */
export const MAX_FILE_SIZE_BYTES = process.env.MAX_FILE_SIZE_BYTES
  ? Number(process.env.MAX_FILE_SIZE_BYTES)
  : 500 * 1024 * 1024;

/** Defaults to `apps/server/uploads/` (resolved from the server process's cwd). */
export function resolveStorageDir(configService: ConfigService): string {
  const configured = configService.get<string>('STORAGE_DIR') ?? 'uploads';
  return resolve(process.cwd(), configured);
}
