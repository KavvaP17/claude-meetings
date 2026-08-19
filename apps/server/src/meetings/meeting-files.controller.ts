import {
  Controller,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MeetingFileValidationPipe } from '../files/meeting-file-validation.pipe';
import { MeetingFileResponseDto } from './dto/meeting-file-response.dto';
import { MeetingFilesService } from './meeting-files.service';

@UseGuards(JwtAuthGuard)
@Controller('meetings')
export class MeetingFilesController {
  constructor(private readonly meetingFilesService: MeetingFilesService) {}

  @Post(':id/files')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('id') meetingId: string,
    @UploadedFile(MeetingFileValidationPipe) file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ): Promise<MeetingFileResponseDto> {
    return this.meetingFilesService.attach(meetingId, req.user.sub, file);
  }
}
