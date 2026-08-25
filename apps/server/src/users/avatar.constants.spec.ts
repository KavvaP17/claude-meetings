import { ConfigService } from '@nestjs/config';
import {
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
});
