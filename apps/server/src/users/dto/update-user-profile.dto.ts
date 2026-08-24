import { IsOptional, IsString, Matches, ValidateIf } from 'class-validator';

export class UpdateUserProfileDto {
  @ValidateIf((dto: UpdateUserProfileDto) => dto.name !== undefined)
  @IsString()
  @Matches(/\S/, { message: 'name must not be empty or whitespace only' })
  name?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
