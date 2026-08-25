import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import multer from 'multer';
import { Observable } from 'rxjs';
import { resolveStorageDir } from '../files/files.constants';
import { isAllowedAvatarFile } from './avatar-file-filter';
import {
  getAllowedAvatarExtensions,
  getAllowedAvatarMimeTypes,
  getMaxAvatarSizeBytes,
} from './avatar.constants';

// Not registered via MulterModule (unlike files.module.ts): the module holding the global
// MULTER_MODULE_OPTIONS token is already claimed by FilesModule for meeting files (audio/video
// mimetypes), and importing a second MulterModule.registerAsync into UsersModule alongside it
// would create an ambiguous provider for that token. Building the multer instance directly here,
// via a constructor-injected ConfigService, sidesteps that while keeping the same dotenv-safe
// timing (this class is only instantiated by Nest's DI, after ConfigModule.forRoot() has run).
@Injectable()
export class AvatarUploadInterceptor implements NestInterceptor {
  private readonly upload: multer.Multer;

  constructor(configService: ConfigService) {
    const allowedMimeTypes = getAllowedAvatarMimeTypes(configService);
    const allowedExtensions = getAllowedAvatarExtensions(configService);

    this.upload = multer({
      storage: multer.diskStorage({
        destination: resolveStorageDir(configService),
        filename: (req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: getMaxAvatarSizeBytes(configService) },
      fileFilter: (req, file, cb) => {
        cb(null, isAllowedAvatarFile(file, allowedMimeTypes, allowedExtensions));
      },
    });
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const ctx = context.switchToHttp();
    await new Promise<void>((resolve, reject) => {
      this.upload.single('avatar')(
        ctx.getRequest<Request>(),
        ctx.getResponse<Response>(),
        (err: unknown) => {
          if (err) {
            reject(this.transformException(err));
            return;
          }
          resolve();
        },
      );
    });
    return next.handle();
  }

  // Mirrors @nestjs/platform-express's own (internal, unexported) multer error mapping closely
  // enough for the one case files.module.ts already documents: an oversized upload is 413, not 400.
  private transformException(error: unknown): HttpException {
    if (error instanceof HttpException) {
      return error;
    }
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return new PayloadTooLargeException(error.message);
    }
    const message = error instanceof Error ? error.message : 'Upload failed';
    return new BadRequestException(message);
  }
}
