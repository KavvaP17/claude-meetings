import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { toUserProfileResponseDto, UserProfileResponseDto } from './dto/user-profile-response.dto';

const PASSWORD_SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
}
