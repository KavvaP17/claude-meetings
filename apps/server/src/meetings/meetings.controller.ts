import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Meeting } from '@prisma/client';
import { Request } from 'express';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { MeetingsService } from './meetings.service';

@UseGuards(JwtAuthGuard)
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  create(
    @Body() dto: CreateMeetingDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<Meeting> {
    return this.meetingsService.create(dto, req.user.sub);
  }

  @Get()
  findAll(): Promise<Meeting[]> {
    return this.meetingsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Meeting> {
    return this.meetingsService.findOne(id);
  }
}
