import { ConfigService } from '@nestjs/config';
import { getAllowedExtensions, getAllowedMimeTypes, getMaxFileSizeBytes } from './files.constants';

function fakeConfigService(values: Record<string, string>): ConfigService {
  return { get: (key: string) => values[key] } as ConfigService;
}

describe('files.constants', () => {
  it('falls back to defaults when no env override is configured', () => {
    const configService = fakeConfigService({});
    expect(getAllowedMimeTypes(configService)).toContain('audio/mpeg');
    expect(getAllowedExtensions(configService)).toContain('.mp3');
    expect(getMaxFileSizeBytes(configService)).toBe(500 * 1024 * 1024);
  });

  // Regression: these must read through ConfigService (not process.env directly), since files.constants.ts
  // can be require()'d before ConfigModule.forRoot() loads .env — a direct process.env read would silently
  // ignore any override placed there.
  it('applies overrides read from ConfigService', () => {
    const configService = fakeConfigService({
      ALLOWED_MIME_TYPES: 'audio/ogg',
      ALLOWED_EXTENSIONS: '.ogg',
      MAX_FILE_SIZE_BYTES: '1024',
    });
    expect(getAllowedMimeTypes(configService)).toEqual(['audio/ogg']);
    expect(getAllowedExtensions(configService)).toEqual(['.ogg']);
    expect(getMaxFileSizeBytes(configService)).toBe(1024);
  });
});
