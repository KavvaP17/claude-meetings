import { MeetingFile, MeetingFileStatus } from '@prisma/client';

export interface MeetingFileResponseDto {
  id: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  status: MeetingFileStatus;
  createdAt: Date;
  uploadedById: string;
}

// Explicit field list — storagePath (and meetingId) are internal storage details, never sent to clients.
export function toMeetingFileResponseDto(file: MeetingFile): MeetingFileResponseDto {
  return {
    id: file.id,
    fileName: file.fileName,
    sizeBytes: file.sizeBytes,
    mimeType: file.mimeType,
    status: file.status,
    createdAt: file.createdAt,
    uploadedById: file.uploadedById,
  };
}
