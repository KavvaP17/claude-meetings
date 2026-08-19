import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Meeting } from '@prisma/client';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { MeetingWithFilesResponseDto } from './dto/meeting-response.dto';
import { MeetingsService } from './meetings.service';

@UseGuards(JwtAuthGuard)
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  create(@Body() dto: CreateMeetingDto, @Req() req: AuthenticatedRequest): Promise<Meeting> {
    return this.meetingsService.create(dto, req.user.sub);
  }

  @Get()
  findAll(): Promise<Meeting[]> {
    return this.meetingsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<MeetingWithFilesResponseDto> {
    return this.meetingsService.findOne(id);
  }
}
