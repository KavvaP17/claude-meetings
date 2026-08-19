import { ConfigService } from '@nestjs/config';
import { createMeetingFileValidationPipe } from './meeting-file-validation.pipe';

function fakeConfigService(values: Record<string, string>): ConfigService {
  return { get: (key: string) => values[key] } as ConfigService;
}

// Multer's diskStorage (files.module.ts) never sets `.buffer` — only memoryStorage does.
function diskStoredFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    mimetype: 'audio/mpeg',
    originalname: 'recording.mp3',
    size: 1024,
    ...overrides,
  } as Express.Multer.File;
}

describe('createMeetingFileValidationPipe', () => {
  const configService = fakeConfigService({ MAX_FILE_SIZE_BYTES: '2048' });

  // Regression: FileTypeValidator's magic-number sniffing needs file.buffer, which diskStorage never
  // populates — without skipMagicNumbersValidation this would reject every file, allowed or not.
  it('accepts an allowed, disk-stored file with no buffer', async () => {
    const pipe = createMeetingFileValidationPipe(configService);
    await expect(pipe.transform(diskStoredFile())).resolves.toBeDefined();
  });

  it('rejects a disallowed mimetype with a 400', async () => {
    const pipe = createMeetingFileValidationPipe(configService);
    await expect(
      pipe.transform(diskStoredFile({ mimetype: 'application/octet-stream' })),
    ).rejects.toThrow();
  });

  it('rejects a file exceeding the configured max size with a 400', async () => {
    const pipe = createMeetingFileValidationPipe(configService);
    await expect(pipe.transform(diskStoredFile({ size: 4096 }))).rejects.toThrow();
  });
});
