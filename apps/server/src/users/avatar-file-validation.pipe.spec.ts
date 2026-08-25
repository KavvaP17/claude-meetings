import { ConfigService } from '@nestjs/config';
import { AvatarFileValidationPipe } from './avatar-file-validation.pipe';

function fakeConfigService(values: Record<string, string>): ConfigService {
  return { get: (key: string) => values[key] } as ConfigService;
}

// Multer's diskStorage (avatar-upload.interceptor.ts) never sets `.buffer` — only memoryStorage does.
function diskStoredFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    mimetype: 'image/png',
    originalname: 'avatar.png',
    size: 1024,
    ...overrides,
  } as Express.Multer.File;
}

describe('AvatarFileValidationPipe', () => {
  const configService = fakeConfigService({ MAX_AVATAR_SIZE_BYTES: '2048' });

  it('accepts an allowed, disk-stored file with no buffer', async () => {
    const pipe = new AvatarFileValidationPipe(configService);
    await expect(pipe.transform(diskStoredFile())).resolves.toBeDefined();
  });

  it('rejects a disallowed mimetype with a 400', async () => {
    const pipe = new AvatarFileValidationPipe(configService);
    await expect(
      pipe.transform(diskStoredFile({ mimetype: 'application/octet-stream' })),
    ).rejects.toThrow();
  });

  it('rejects a file exceeding the configured max size with a 400', async () => {
    const pipe = new AvatarFileValidationPipe(configService);
    await expect(pipe.transform(diskStoredFile({ size: 4096 }))).rejects.toThrow();
  });

  it('rejects a missing file with a 400', async () => {
    const pipe = new AvatarFileValidationPipe(configService);
    await expect(pipe.transform(undefined)).rejects.toThrow();
  });
});
