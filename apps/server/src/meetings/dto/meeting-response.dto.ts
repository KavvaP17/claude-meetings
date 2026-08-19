import { Meeting, MeetingFile } from '@prisma/client';
import { MeetingFileResponseDto, toMeetingFileResponseDto } from './meeting-file-response.dto';

export interface MeetingWithFilesResponseDto extends Meeting {
  files: MeetingFileResponseDto[];
}

export function toMeetingWithFilesResponseDto(
  meeting: Meeting & { files: MeetingFile[] },
): MeetingWithFilesResponseDto {
  return {
    ...meeting,
    files: meeting.files.map(toMeetingFileResponseDto),
  };
}
