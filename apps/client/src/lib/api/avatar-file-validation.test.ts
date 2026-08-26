import { describe, expect, it } from 'vitest';
import {
  ALLOWED_AVATAR_MIME_TYPES,
  MAX_AVATAR_SIZE_BYTES,
  validateAvatarFile,
} from './avatar-file-validation';

function fakeFile(name: string, type: string, sizeBytes: number): File {
  return new File([new Uint8Array(Math.min(sizeBytes, 1024))], name, { type });
}

// jsdom's File.size reflects the actual blob content length, not an arbitrary override —
// tests near MAX_AVATAR_SIZE_BYTES build a real (small) blob and assert against a stubbed size instead.
function fileWithSize(name: string, type: string, sizeBytes: number): File {
  const file = fakeFile(name, type, 0);
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

describe('validateAvatarFile', () => {
  it.each(ALLOWED_AVATAR_MIME_TYPES)('accepts a small file with mime type %s', (mimeType) => {
    expect(validateAvatarFile(fakeFile('avatar.jpg', mimeType, 1024))).toBeNull();
  });

  it('rejects a disallowed mime type', () => {
    const error = validateAvatarFile(fakeFile('avatar.gif', 'image/gif', 1024));
    expect(error).toContain('Unsupported file type');
  });

  it('rejects a file with no mime type', () => {
    const error = validateAvatarFile(fakeFile('avatar', '', 1024));
    expect(error).toContain('Unsupported file type');
  });

  it('accepts a file exactly at the size limit', () => {
    expect(
      validateAvatarFile(fileWithSize('avatar.png', 'image/png', MAX_AVATAR_SIZE_BYTES)),
    ).toBeNull();
  });

  it('rejects a file over the size limit', () => {
    const error = validateAvatarFile(
      fileWithSize('avatar.png', 'image/png', MAX_AVATAR_SIZE_BYTES + 1),
    );
    expect(error).toContain('too large');
  });

  it('checks the mime type before the size, so an oversized disallowed file reports the format error', () => {
    const error = validateAvatarFile(
      fileWithSize('avatar.gif', 'image/gif', MAX_AVATAR_SIZE_BYTES + 1),
    );
    expect(error).toContain('Unsupported file type');
  });
});
