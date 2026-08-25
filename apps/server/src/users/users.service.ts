import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { FilesStorageService } from '../files/files-storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { buildAvatarUrl, extractAvatarStoragePath } from './avatar.constants';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { toUserProfileResponseDto, UserProfileResponseDto } from './dto/user-profile-response.dto';

const PASSWORD_SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesStorageService: FilesStorageService,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(email: string, password: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
    return this.prisma.user.create({
      data: { email, password: hashedPassword },
    });
  }

  async getProfile(id: string): Promise<UserProfileResponseDto> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return toUserProfileResponseDto(user);
  }

  async updateProfile(id: string, dto: UpdateUserProfileDto): Promise<UserProfileResponseDto> {
    try {
      const user = await this.prisma.user.update({ where: { id }, data: dto });
      return toUserProfileResponseDto(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`User with id ${id} not found`);
      }
      throw error;
    }
  }

  // By the time this runs, AvatarUploadInterceptor's multer diskStorage has already written `file` to
  // disk — mirrors MeetingFilesService.attach's cleanup discipline: a DB update failure must delete the
  // just-saved file (nothing would reference it otherwise), and a successful swap must delete the
  // previous avatar file (the User row keeps only the current avatarUrl, so the old one would never be
  // cleaned up otherwise).
  async updateAvatar(id: string, file: Express.Multer.File): Promise<UserProfileResponseDto> {
    const existingUser = await this.findById(id);
    if (!existingUser) {
      await this.filesStorageService.delete(file.filename);
      throw new NotFoundException(`User with id ${id} not found`);
    }

    const { storagePath } = await this.filesStorageService.save(file);
    const avatarUrl = buildAvatarUrl(storagePath);

    let updatedUser: User;
    try {
      updatedUser = await this.prisma.user.update({ where: { id }, data: { avatarUrl } });
    } catch (error) {
      await this.filesStorageService.delete(storagePath);
      throw error;
    }

    const previousStoragePath = extractAvatarStoragePath(existingUser.avatarUrl);
    if (previousStoragePath) {
      await this.filesStorageService.delete(previousStoragePath);
    }

    return toUserProfileResponseDto(updatedUser);
  }
}
