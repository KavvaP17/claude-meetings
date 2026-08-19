import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FilesStorageService } from '../files/files-storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { MeetingFileResponseDto, toMeetingFileResponseDto } from './dto/meeting-file-response.dto';

@Injectable()
export class MeetingFilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesStorageService: FilesStorageService,
  ) {}

  async attach(
    meetingId: string,
    uploaderId: string,
    file: Express.Multer.File,
  ): Promise<MeetingFileResponseDto> {
    // By the time this runs, multer's diskStorage has already written `file` to disk (it happens in the
    // FileInterceptor, before this service method) — every error path below must clean it up, or a rejected
    // upload (wrong/foreign meetingId) leaks a file on disk that no DB row ever references.
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) {
      await this.filesStorageService.delete(file.filename);
      throw new NotFoundException(`Meeting with id ${meetingId} not found`);
    }
    if (meeting.creatorId !== uploaderId) {
      await this.filesStorageService.delete(file.filename);
      throw new ForbiddenException('Only the meeting creator can upload files');
    }

    const { storagePath } = await this.filesStorageService.save(file);

    try {
      const meetingFile = await this.prisma.meetingFile.create({
        data: {
          meetingId,
          fileName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          storagePath,
          uploadedById: uploaderId,
        },
      });
      return toMeetingFileResponseDto(meetingFile);
    } catch (error) {
      await this.filesStorageService.delete(storagePath);
      throw error;
    }
  }
}
