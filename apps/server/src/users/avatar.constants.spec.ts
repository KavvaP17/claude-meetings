import { ConfigService } from '@nestjs/config';
import {
  buildAvatarUrl,
  extractAvatarStoragePath,
  getAllowedAvatarExtensions,
  getAllowedAvatarMimeTypes,
  getMaxAvatarSizeBytes,
} from './avatar.constants';

function fakeConfigService(values: Record<string, string>): ConfigService {
  return { get: (key: string) => values[key] } as ConfigService;
}

describe('avatar.constants', () => {
  it('falls back to defaults when no env override is configured', () => {
    const configService = fakeConfigService({});
    expect(getAllowedAvatarMimeTypes(configService)).toEqual([
      'image/jpeg',
      'image/png',
      'image/webp',
    ]);
    expect(getAllowedAvatarExtensions(configService)).toEqual(['.jpg', '.jpeg', '.png', '.webp']);
    expect(getMaxAvatarSizeBytes(configService)).toBe(5 * 1024 * 1024);
  });

  // Regression: must read through ConfigService (not process.env directly), matching files.constants.ts —
  // this module can be require()'d before ConfigModule.forRoot() loads .env.
  it('applies overrides read from ConfigService', () => {
    const configService = fakeConfigService({
      ALLOWED_AVATAR_MIME_TYPES: 'image/gif',
      ALLOWED_AVATAR_EXTENSIONS: '.gif',
      MAX_AVATAR_SIZE_BYTES: '1024',
    });
    expect(getAllowedAvatarMimeTypes(configService)).toEqual(['image/gif']);
    expect(getAllowedAvatarExtensions(configService)).toEqual(['.gif']);
    expect(getMaxAvatarSizeBytes(configService)).toBe(1024);
  });

  describe('buildAvatarUrl', () => {
    it('prefixes the stored file name with the uploads URL path', () => {
      expect(buildAvatarUrl('a1b2c3.png')).toBe('/uploads/a1b2c3.png');
    });
  });

  describe('extractAvatarStoragePath', () => {
    const uuidFileName = '3fa85f64-5717-4562-b3fc-2c963f66afa6.png';

    it('returns the stored file name for a URL built by buildAvatarUrl', () => {
      expect(extractAvatarStoragePath(buildAvatarUrl(uuidFileName))).toBe(uuidFileName);
    });

    it('returns null for null', () => {
      expect(extractAvatarStoragePath(null)).toBeNull();
    });

    it('returns null when the URL is missing the /uploads/ prefix', () => {
      expect(extractAvatarStoragePath(`https://example.com/${uuidFileName}`)).toBeNull();
    });

    // Security boundary: extractAvatarStoragePath's result feeds FilesStorageService.delete(), so a
    // permissive extraction would let a crafted avatarUrl (e.g. containing `../`) make a later avatar
    // upload delete an arbitrary file — defense-in-depth against any path that might write a bad
    // avatarUrl onto the User row (avatarUrl is no longer settable via PATCH /users/me at all).
    it('returns null for a path-traversal payload disguised as an uploads URL', () => {
      expect(extractAvatarStoragePath('/uploads/../../etc/passwd')).toBeNull();
    });

    it('returns null for an arbitrary non-UUID file name', () => {
      expect(extractAvatarStoragePath('/uploads/avatar.png')).toBeNull();
    });

    // Security boundary: a UUID-shaped path with a non-avatar extension (e.g. an .mp4 saved by
    // MeetingFilesService under the same STORAGE_DIR) must not be treated as a deletable avatar file,
    // even though it matches the UUID naming convention shared by both upload features.
    it('returns null for a UUID file name with an extension avatars never use', () => {
      expect(
        extractAvatarStoragePath('/uploads/3fa85f64-5717-4562-b3fc-2c963f66afa6.mp4'),
      ).toBeNull();
    });
  });
});
