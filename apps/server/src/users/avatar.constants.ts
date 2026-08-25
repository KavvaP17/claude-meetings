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

const AVATAR_URL_PREFIX = '/uploads/';

// storagePath (FilesStorageService.save's return value) is just the on-disk file name — this turns
// it into the relative URL clients store as User.avatarUrl and resolve against the API origin.
export function buildAvatarUrl(storagePath: string): string {
  return `${AVATAR_URL_PREFIX}${storagePath}`;
}

// AvatarUploadInterceptor always names files `${randomUUID()}${ext}`, where ext is one of
// DEFAULT_ALLOWED_AVATAR_EXTENSIONS — matching that shape strictly (rather than just stripping the
// prefix, or accepting any extension) is a security boundary, not cosmetics: avatarUrl can also be set
// to an arbitrary string via PATCH /users/me, and the result of this function is later passed to
// FilesStorageService.delete(), which joins it onto STORAGE_DIR — an unvalidated value (e.g. containing
// `../`, or a non-avatar extension like `.mp4` pointing at an unrelated file saved under the same
// STORAGE_DIR by MeetingFilesService) would let a client-supplied avatarUrl direct a later avatar
// upload to delete an arbitrary file.
const STORED_AVATAR_EXTENSION_PATTERN = DEFAULT_ALLOWED_AVATAR_EXTENSIONS.map((ext) =>
  ext.slice(1),
).join('|');
const STORED_AVATAR_FILE_NAME_PATTERN = new RegExp(
  `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(${STORED_AVATAR_EXTENSION_PATTERN})$`,
  'i',
);

export function extractAvatarStoragePath(avatarUrl: string | null): string | null {
  if (!avatarUrl || !avatarUrl.startsWith(AVATAR_URL_PREFIX)) {
    return null;
  }
  const storagePath = avatarUrl.slice(AVATAR_URL_PREFIX.length);
  return STORED_AVATAR_FILE_NAME_PATTERN.test(storagePath) ? storagePath : null;
}
