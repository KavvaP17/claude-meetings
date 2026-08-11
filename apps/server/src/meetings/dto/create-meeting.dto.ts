import { IsArray, IsISO8601, IsNotEmpty, IsString } from 'class-validator';

export class CreateMeetingDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsISO8601()
  date: string;

  @IsArray()
  @IsString({ each: true })
  participants: string[];
}
