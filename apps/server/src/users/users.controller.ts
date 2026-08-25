import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FilesStorageService } from '../files/files-storage.service';
import { AvatarFileValidationPipe } from './avatar-file-validation.pipe';
import { AvatarUploadInterceptor } from './avatar-upload.interceptor';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly filesStorageService: FilesStorageService,
  ) {}

  @Get('me')
  me(@Req() req: AuthenticatedRequest): Promise<UserProfileResponseDto> {
    return this.usersService.getProfile(req.user.sub);
  }

  @Patch('me')
  updateMe(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateUserProfileDto,
  ): Promise<UserProfileResponseDto> {
    return this.usersService.updateProfile(req.user.sub, dto);
  }

  @Post('me/avatar')
  @UseInterceptors(AvatarUploadInterceptor)
  async uploadAvatar(
    @UploadedFile(AvatarFileValidationPipe) file: Express.Multer.File,
  ): Promise<void> {
    await this.filesStorageService.save(file);
  }
}
