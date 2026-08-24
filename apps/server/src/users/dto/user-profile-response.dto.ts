import { User } from '@prisma/client';

export interface UserProfileResponseDto {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: Date;
}

// Explicit field list — password is a hash and must never be sent to clients.
export function toUserProfileResponseDto(user: User): UserProfileResponseDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}
