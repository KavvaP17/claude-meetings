import {
  BadRequestException,
  FileTypeValidator,
  Injectable,
  MaxFileSizeValidator,
  ParseFilePipe,
  PipeTransform,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAllowedMimeTypes, getMaxFileSizeBytes } from './files.constants';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Final 400 layer for @UploadedFile() — multer's limits/fileFilter (files.module.ts) are the earlier barrier.
@Injectable()
export class MeetingFileValidationPipe implements PipeTransform<Express.Multer.File | undefined> {
  private readonly delegate: ParseFilePipe;

  constructor(configService: ConfigService) {
    const allowedMimeTypePattern = new RegExp(
      `^(${getAllowedMimeTypes(configService).map(escapeRegExp).join('|')})$`,
    );

    this.delegate = new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: getMaxFileSizeBytes(configService) }),
        // skipMagicNumbersValidation: diskStorage never populates file.buffer, so magic-number sniffing would reject every file.
        new FileTypeValidator({
          fileType: allowedMimeTypePattern,
          skipMagicNumbersValidation: true,
        }),
      ],
      exceptionFactory: (error) => new BadRequestException(`Недопустимый файл: ${error}`),
    });
  }

  transform(file: Express.Multer.File | undefined): Promise<Express.Multer.File> {
    return this.delegate.transform(file) as Promise<Express.Multer.File>;
  }
}
