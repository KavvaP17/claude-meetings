import {
  BadRequestException,
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
} from '@nestjs/common';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from './files.constants';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ALLOWED_MIME_TYPE_PATTERN = new RegExp(
  `^(${ALLOWED_MIME_TYPES.map(escapeRegExp).join('|')})$`,
);

// Final 400 layer for @UploadedFile() (Фаза 3) — multer's limits/fileFilter (files.module.ts) are the earlier barrier.
export function createMeetingFileValidationPipe(): ParseFilePipe {
  return new ParseFilePipe({
    validators: [
      new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE_BYTES }),
      new FileTypeValidator({ fileType: ALLOWED_MIME_TYPE_PATTERN }),
    ],
    exceptionFactory: (error) => new BadRequestException(`Недопустимый файл: ${error}`),
  });
}
