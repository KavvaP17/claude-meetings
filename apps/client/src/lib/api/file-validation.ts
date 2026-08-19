import { formatFileSize } from '../format';

// Mirrors apps/server/src/files/files.constants.ts defaults. No shared package between
// client/server in this workspace (see root CLAUDE.md), so this duplication is intentional —
// see research doc §7.
export const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.mp4'];
export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024;

export function validateMeetingFile(file: File): string | null {
  const dotIndex = file.name.lastIndexOf('.');
  const extension = dotIndex === -1 ? '' : file.name.slice(dotIndex).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return `Unsupported file type. Allowed formats: ${ALLOWED_EXTENSIONS.join(', ')}.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE_BYTES)}.`;
  }
  return null;
}
