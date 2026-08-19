import { extname } from 'node:path';
import { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES } from './files.constants';

// MIME type + extension only — both are spoofable, but sufficient for trusted JWT-authenticated uploads (see research doc §2).
export function isAllowedMeetingFile(
  file: Pick<Express.Multer.File, 'mimetype' | 'originalname'>,
): boolean {
  return (
    ALLOWED_MIME_TYPES.includes(file.mimetype) &&
    ALLOWED_EXTENSIONS.includes(extname(file.originalname).toLowerCase())
  );
}
