import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { FilesStorageService } from './files-storage.service';

function fakeConfigService(storageDir: string): ConfigService {
  return {
    get: (key: string) => (key === 'STORAGE_DIR' ? storageDir : undefined),
  } as ConfigService;
}

describe('FilesStorageService', () => {
  let storageDir: string;
  let service: FilesStorageService;

  beforeEach(async () => {
    storageDir = mkdtempSync(join(tmpdir(), 'files-storage-service-'));
    service = new FilesStorageService(fakeConfigService(storageDir));
    await service.onModuleInit();
  });

  afterEach(() => {
    rmSync(storageDir, { recursive: true, force: true });
  });

  it('removes a file that was written to storageDir', async () => {
    writeFileSync(join(storageDir, 'a.mp3'), 'content');

    await service.delete('a.mp3');

    expect(readdirSync(storageDir)).toEqual([]);
  });

  // Regression: MeetingFilesService relies on this being a no-op when cleaning up after a rejected upload
  // whose file may already be gone (e.g. cleanup ran twice), so it must not mask the original error.
  it('does not throw when the file does not exist', async () => {
    await expect(service.delete('does-not-exist.mp3')).resolves.toBeUndefined();
  });
});
