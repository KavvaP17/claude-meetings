import {
  BadRequestException,
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAllowedMimeTypes, getMaxFileSizeBytes } from './files.constants';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Final 400 layer for @UploadedFile() (Фаза 3) — multer's limits/fileFilter (files.module.ts) are the earlier barrier.
export function createMeetingFileValidationPipe(configService: ConfigService): ParseFilePipe {
  const allowedMimeTypePattern = new RegExp(
    `^(${getAllowedMimeTypes(configService).map(escapeRegExp).join('|')})$`,
  );

  return new ParseFilePipe({
    validators: [
      new MaxFileSizeValidator({ maxSize: getMaxFileSizeBytes(configService) }),
      // skipMagicNumbersValidation: diskStorage never populates file.buffer, so magic-number sniffing would reject every file.
      new FileTypeValidator({ fileType: allowedMimeTypePattern, skipMagicNumbersValidation: true }),
    ],
    exceptionFactory: (error) => new BadRequestException(`Недопустимый файл: ${error}`),
  });
}
