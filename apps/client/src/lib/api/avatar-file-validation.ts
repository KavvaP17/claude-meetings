import { formatFileSize } from '../format';

// Mirrors apps/server/src/users/avatar.constants.ts defaults. No shared package between
// client/server in this workspace (see root CLAUDE.md), so this duplication is intentional —
// see file-validation.ts for the same pattern applied to meeting files.
export const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

export function validateAvatarFile(file: File): string | null {
  if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.type)) {
    return `Unsupported file type. Allowed formats: ${ALLOWED_AVATAR_MIME_TYPES.join(', ')}.`;
  }
  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    return `File is too large. Maximum size is ${formatFileSize(MAX_AVATAR_SIZE_BYTES)}.`;
  }
  return null;
}
