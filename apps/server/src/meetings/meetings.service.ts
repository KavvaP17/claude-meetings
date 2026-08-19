import { Injectable, NotFoundException } from '@nestjs/common';
import { Meeting } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import {
  MeetingWithFilesResponseDto,
  toMeetingWithFilesResponseDto,
} from './dto/meeting-response.dto';

@Injectable()
export class MeetingsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateMeetingDto, creatorId: string): Promise<Meeting> {
    return this.prisma.meeting.create({
      data: {
        title: dto.title,
        date: new Date(dto.date),
        participants: dto.participants,
        creatorId,
      },
    });
  }

  findAll(): Promise<Meeting[]> {
    return this.prisma.meeting.findMany();
  }

  async findOne(id: string): Promise<MeetingWithFilesResponseDto> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id },
      include: { files: true },
    });
    if (!meeting) {
      throw new NotFoundException(`Meeting with id ${id} not found`);
    }
    return toMeetingWithFilesResponseDto(meeting);
  }
}
