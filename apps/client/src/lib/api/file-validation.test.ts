import { describe, expect, it } from 'vitest';
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES, validateMeetingFile } from './file-validation';

function fakeFile(name: string, sizeBytes: number): File {
  return new File([new Uint8Array(Math.min(sizeBytes, 1024))], name, {
    type: 'application/octet-stream',
  });
}

// jsdom's File.size reflects the actual blob content length, not an arbitrary override —
// tests near MAX_FILE_SIZE_BYTES build a real (small) blob and assert against a stubbed size instead.
function fileWithSize(name: string, sizeBytes: number): File {
  const file = fakeFile(name, 0);
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

describe('validateMeetingFile', () => {
  it.each(ALLOWED_EXTENSIONS)('accepts a small file with the %s extension', (extension) => {
    expect(validateMeetingFile(fakeFile(`recording${extension}`, 1024))).toBeNull();
  });

  it('is case-insensitive on the extension', () => {
    expect(validateMeetingFile(fakeFile('RECORDING.MP3', 1024))).toBeNull();
  });

  it('rejects a disallowed extension', () => {
    const error = validateMeetingFile(fakeFile('malware.exe', 1024));
    expect(error).toContain('Unsupported file type');
  });

  it('rejects a file with no extension at all', () => {
    const error = validateMeetingFile(fakeFile('recording', 1024));
    expect(error).toContain('Unsupported file type');
  });

  it('accepts a file exactly at the size limit', () => {
    expect(validateMeetingFile(fileWithSize('recording.mp3', MAX_FILE_SIZE_BYTES))).toBeNull();
  });

  it('rejects a file over the size limit', () => {
    const error = validateMeetingFile(fileWithSize('recording.mp3', MAX_FILE_SIZE_BYTES + 1));
    expect(error).toContain('too large');
  });

  it('checks the extension before the size, so an oversized disallowed file reports the format error', () => {
    const error = validateMeetingFile(fileWithSize('malware.exe', MAX_FILE_SIZE_BYTES + 1));
    expect(error).toContain('Unsupported file type');
  });
});
