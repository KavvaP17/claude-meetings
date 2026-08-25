import {
  BadRequestException,
  FileTypeValidator,
  Injectable,
  MaxFileSizeValidator,
  ParseFilePipe,
  PipeTransform,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAllowedAvatarMimeTypes, getMaxAvatarSizeBytes } from './avatar.constants';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Final 400 layer for @UploadedFile() — AvatarUploadInterceptor's limits/fileFilter are the earlier barrier.
@Injectable()
export class AvatarFileValidationPipe implements PipeTransform<Express.Multer.File | undefined> {
  private readonly delegate: ParseFilePipe;

  constructor(configService: ConfigService) {
    const allowedMimeTypePattern = new RegExp(
      `^(${getAllowedAvatarMimeTypes(configService).map(escapeRegExp).join('|')})$`,
    );

    this.delegate = new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: getMaxAvatarSizeBytes(configService) }),
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
