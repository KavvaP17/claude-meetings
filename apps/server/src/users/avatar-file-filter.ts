import { extname } from 'node:path';

// Mimetype + extension, mirroring meeting files' file-filter.ts — both are spoofable, but this
// still catches a mismatched pair (e.g. an .svg/.html upload disguised with an image/* mimetype).
export function isAllowedAvatarFile(
  file: Pick<Express.Multer.File, 'mimetype' | 'originalname'>,
  allowedMimeTypes: string[],
  allowedExtensions: string[],
): boolean {
  return (
    allowedMimeTypes.includes(file.mimetype) &&
    allowedExtensions.includes(extname(file.originalname).toLowerCase())
  );
}
