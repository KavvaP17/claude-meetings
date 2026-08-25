import { isAllowedAvatarFile } from './avatar-file-filter';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

function file(mimetype: string, originalname: string): { mimetype: string; originalname: string } {
  return { mimetype, originalname };
}

describe('isAllowedAvatarFile', () => {
  it.each(ALLOWED_EXTENSIONS)('accepts an allowed mimetype with a %s extension', (extension) => {
    expect(
      isAllowedAvatarFile(
        file('image/png', `avatar${extension}`),
        ALLOWED_MIME_TYPES,
        ALLOWED_EXTENSIONS,
      ),
    ).toBe(true);
  });

  it('rejects a disallowed mimetype', () => {
    expect(
      isAllowedAvatarFile(
        file('application/octet-stream', 'avatar.png'),
        ALLOWED_MIME_TYPES,
        ALLOWED_EXTENSIONS,
      ),
    ).toBe(false);
  });

  it('rejects an allowed mimetype with a disallowed extension (spoofed content-type)', () => {
    expect(
      isAllowedAvatarFile(file('image/png', 'avatar.svg'), ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS),
    ).toBe(false);
  });
});
