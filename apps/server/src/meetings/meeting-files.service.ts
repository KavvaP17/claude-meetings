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
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) {
      throw new NotFoundException(`Meeting with id ${meetingId} not found`);
    }
    if (meeting.creatorId !== uploaderId) {
      throw new ForbiddenException('Only the meeting creator can upload files');
    }

    const { storagePath } = await this.filesStorageService.save(file);

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
  }
}
