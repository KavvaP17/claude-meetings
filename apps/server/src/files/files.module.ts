import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { isAllowedMeetingFile } from './file-filter';
import { FilesStorageService } from './files-storage.service';
import {
  getAllowedExtensions,
  getAllowedMimeTypes,
  getMaxFileSizeBytes,
  resolveStorageDir,
} from './files.constants';
import { MeetingFileValidationPipe } from './meeting-file-validation.pipe';

@Module({
  imports: [
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const allowedMimeTypes = getAllowedMimeTypes(configService);
        const allowedExtensions = getAllowedExtensions(configService);

        return {
          storage: diskStorage({
            destination: resolveStorageDir(configService),
            filename: (req, file, cb) => {
              cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
            },
          }),
          limits: { fileSize: getMaxFileSizeBytes(configService) },
          fileFilter: (req, file, cb) => {
            cb(null, isAllowedMeetingFile(file, allowedMimeTypes, allowedExtensions));
          },
        };
      },
    }),
  ],
  providers: [FilesStorageService, MeetingFileValidationPipe],
  exports: [MulterModule, FilesStorageService, MeetingFileValidationPipe],
})
export class FilesModule {}
