import { Controller, Get, NotFoundException, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: Date;
}

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async me(@Req() req: AuthenticatedRequest): Promise<UserProfile> {
    const user = await this.usersService.findById(req.user.sub);
    if (!user) {
      throw new NotFoundException(`User with id ${req.user.sub} not found`);
    }
    const { id, email, name, avatarUrl, createdAt } = user;
    return { id, email, name, avatarUrl, createdAt };
  }
}
