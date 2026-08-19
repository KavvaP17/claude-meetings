import { extname } from 'node:path';

// MIME type + extension only — both are spoofable, but sufficient for trusted JWT-authenticated uploads (see research doc §2).
export function isAllowedMeetingFile(
  file: Pick<Express.Multer.File, 'mimetype' | 'originalname'>,
  allowedMimeTypes: string[],
  allowedExtensions: string[],
): boolean {
  return (
    allowedMimeTypes.includes(file.mimetype) &&
    allowedExtensions.includes(extname(file.originalname).toLowerCase())
  );
}
