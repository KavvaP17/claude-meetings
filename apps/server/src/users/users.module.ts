import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FilesModule } from '../files/files.module';
import { AvatarFileValidationPipe } from './avatar-file-validation.pipe';
import { AvatarUploadInterceptor } from './avatar-upload.interceptor';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [forwardRef(() => AuthModule), FilesModule],
  controllers: [UsersController],
  providers: [UsersService, AvatarUploadInterceptor, AvatarFileValidationPipe],
  exports: [UsersService],
})
export class UsersModule {}
