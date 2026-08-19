import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FilesModule } from '../files/files.module';
import { MeetingFilesController } from './meeting-files.controller';
import { MeetingFilesService } from './meeting-files.service';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';

@Module({
  imports: [AuthModule, FilesModule],
  controllers: [MeetingsController, MeetingFilesController],
  providers: [MeetingsService, MeetingFilesService],
})
export class MeetingsModule {}
