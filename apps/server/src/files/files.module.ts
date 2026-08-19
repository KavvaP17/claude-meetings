import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { isAllowedMeetingFile } from './file-filter';
import { FilesStorageService } from './files-storage.service';
import { MAX_FILE_SIZE_BYTES, resolveStorageDir } from './files.constants';

@Module({
  imports: [
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        storage: diskStorage({
          destination: resolveStorageDir(configService),
          filename: (req, file, cb) => {
            cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
          },
        }),
        limits: { fileSize: MAX_FILE_SIZE_BYTES },
        fileFilter: (req, file, cb) => {
          cb(null, isAllowedMeetingFile(file));
        },
      }),
    }),
  ],
  providers: [FilesStorageService],
  exports: [MulterModule, FilesStorageService],
})
export class FilesModule {}
