import { resolve } from 'node:path';
import { ConfigService } from '@nestjs/config';

function parseList(value: string | undefined, defaults: string[]): string[] {
  return value ? value.split(',').map((entry) => entry.trim()) : defaults;
}

const DEFAULT_ALLOWED_MIME_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/x-m4a',
  'audio/mp4',
  'video/mp4',
];

const DEFAULT_ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.mp4'];

// 500 MB. MeetingFile.sizeBytes is Postgres `Int` (max ~2.1 GB) — stay well under that.
const DEFAULT_MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024;

// Read via ConfigService (not process.env directly): these modules can be require()'d before
// ConfigModule.forRoot() runs its dotenv load, so a direct process.env read would miss .env overrides.
export function getAllowedMimeTypes(configService: ConfigService): string[] {
  return parseList(configService.get<string>('ALLOWED_MIME_TYPES'), DEFAULT_ALLOWED_MIME_TYPES);
}

export function getAllowedExtensions(configService: ConfigService): string[] {
  return parseList(configService.get<string>('ALLOWED_EXTENSIONS'), DEFAULT_ALLOWED_EXTENSIONS);
}

export function getMaxFileSizeBytes(configService: ConfigService): number {
  const configured = configService.get<string>('MAX_FILE_SIZE_BYTES');
  return configured ? Number(configured) : DEFAULT_MAX_FILE_SIZE_BYTES;
}

/** Defaults to `apps/server/uploads/` (resolved from the server process's cwd). */
export function resolveStorageDir(configService: ConfigService): string {
  const configured = configService.get<string>('STORAGE_DIR') ?? 'uploads';
  return resolve(process.cwd(), configured);
}
