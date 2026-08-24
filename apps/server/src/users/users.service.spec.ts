import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let prisma: PrismaService;
  let service: UsersService;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    service = new UsersService(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('findById', () => {
    it('returns the user matching the given id', async () => {
      const email = `find-by-id-${Date.now()}@example.com`;
      const created = await service.create(email, 'password123');

      const found = await service.findById(created.id);

      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe(email);
    });

    it('returns null when no user matches the id', async () => {
      const found = await service.findById('00000000-0000-0000-0000-000000000000');

      expect(found).toBeNull();
    });
  });

  describe('getProfile', () => {
    it('returns the profile DTO for an existing user, excluding the password', async () => {
      const email = `get-profile-${Date.now()}@example.com`;
      const created = await service.create(email, 'password123');

      const profile = await service.getProfile(created.id);

      expect(profile).toEqual({
        id: created.id,
        email,
        name: null,
        avatarUrl: null,
        createdAt: created.createdAt,
      });
    });

    it('throws NotFoundException when no user matches the id', async () => {
      await expect(service.getProfile('00000000-0000-0000-0000-000000000000')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
