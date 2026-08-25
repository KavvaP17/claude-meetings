import { ConfigService } from '@nestjs/config';

function parseList(value: string | undefined, defaults: string[]): string[] {
  return value ? value.split(',').map((entry) => entry.trim()) : defaults;
}

const DEFAULT_ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const DEFAULT_ALLOWED_AVATAR_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// 5 MB.
const DEFAULT_MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

// Read via ConfigService (not process.env directly): mirrors files.constants.ts — this module can be
// require()'d before ConfigModule.forRoot() runs its dotenv load, so a direct process.env read would miss
// .env overrides.
export function getAllowedAvatarMimeTypes(configService: ConfigService): string[] {
  return parseList(
    configService.get<string>('ALLOWED_AVATAR_MIME_TYPES'),
    DEFAULT_ALLOWED_AVATAR_MIME_TYPES,
  );
}

export function getAllowedAvatarExtensions(configService: ConfigService): string[] {
  return parseList(
    configService.get<string>('ALLOWED_AVATAR_EXTENSIONS'),
    DEFAULT_ALLOWED_AVATAR_EXTENSIONS,
  );
}

export function getMaxAvatarSizeBytes(configService: ConfigService): number {
  const configured = configService.get<string>('MAX_AVATAR_SIZE_BYTES');
  return configured ? Number(configured) : DEFAULT_MAX_AVATAR_SIZE_BYTES;
}
