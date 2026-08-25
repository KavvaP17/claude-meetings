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

  describe('updateProfile', () => {
    it('updates the name and returns the profile DTO', async () => {
      const email = `update-profile-name-${Date.now()}@example.com`;
      const created = await service.create(email, 'password123');

      const profile = await service.updateProfile(created.id, { name: 'New Name' });

      expect(profile).toEqual({
        id: created.id,
        email,
        name: 'New Name',
        avatarUrl: null,
        createdAt: created.createdAt,
      });
    });

    it('updates the avatarUrl and returns the profile DTO', async () => {
      const email = `update-profile-avatar-${Date.now()}@example.com`;
      const created = await service.create(email, 'password123');

      const profile = await service.updateProfile(created.id, { avatarUrl: '/avatars/pic.png' });

      expect(profile).toEqual({
        id: created.id,
        email,
        name: null,
        avatarUrl: '/avatars/pic.png',
        createdAt: created.createdAt,
      });
    });

    it('updates both name and avatarUrl when both are given', async () => {
      const email = `update-profile-both-${Date.now()}@example.com`;
      const created = await service.create(email, 'password123');

      const profile = await service.updateProfile(created.id, {
        name: 'Both Name',
        avatarUrl: '/avatars/both.png',
      });

      expect(profile).toEqual({
        id: created.id,
        email,
        name: 'Both Name',
        avatarUrl: '/avatars/both.png',
        createdAt: created.createdAt,
      });
    });

    it('leaves fields unchanged when they are omitted from the dto', async () => {
      const email = `update-profile-partial-${Date.now()}@example.com`;
      const created = await service.create(email, 'password123');
      await service.updateProfile(created.id, { name: 'Kept Name' });

      const profile = await service.updateProfile(created.id, { avatarUrl: '/avatars/kept.png' });

      expect(profile).toEqual({
        id: created.id,
        email,
        name: 'Kept Name',
        avatarUrl: '/avatars/kept.png',
        createdAt: created.createdAt,
      });
    });

    it('throws NotFoundException when no user matches the id', async () => {
      await expect(
        service.updateProfile('00000000-0000-0000-0000-000000000000', { name: 'Nobody' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
