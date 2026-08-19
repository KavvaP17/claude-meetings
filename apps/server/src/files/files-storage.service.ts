import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveStorageDir } from './files.constants';

@Injectable()
export class FilesStorageService implements OnModuleInit {
  private readonly storageDir: string;

  constructor(configService: ConfigService) {
    this.storageDir = resolveStorageDir(configService);
  }

  async onModuleInit(): Promise<void> {
    await mkdir(this.storageDir, { recursive: true });
  }

  // multer's diskStorage (files.module.ts) already wrote `file` under storageDir by the time this runs;
  // this just records where as an opaque path, so a future non-disk backend only needs to change this method.
  save(file: Express.Multer.File): Promise<{ storagePath: string }> {
    return Promise.resolve({ storagePath: file.filename });
  }

  resolvePath(storagePath: string): string {
    return join(this.storageDir, storagePath);
  }
}
