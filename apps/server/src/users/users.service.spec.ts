import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { FilesStorageService } from '../files/files-storage.service';
import { buildAvatarUrl } from './avatar.constants';
import { UsersService } from './users.service';

// A stub rather than a mock library: updateAvatar's tests care about which storage paths were
// saved/deleted, not about call mechanics, and this keeps FilesStorageService's real disk I/O out of
// a suite that otherwise only exercises PrismaService against the real DB.
class FakeFilesStorageService {
  readonly deletedPaths: string[] = [];

  save(file: Express.Multer.File): Promise<{ storagePath: string }> {
    return Promise.resolve({ storagePath: file.filename });
  }

  delete(storagePath: string): Promise<void> {
    this.deletedPaths.push(storagePath);
    return Promise.resolve();
  }
}

function fakeAvatarFile(filename: string): Express.Multer.File {
  return { filename } as Express.Multer.File;
}

describe('UsersService', () => {
  let prisma: PrismaService;
  let filesStorageService: FakeFilesStorageService;
  let service: UsersService;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
  });

  beforeEach(() => {
    filesStorageService = new FakeFilesStorageService();
    service = new UsersService(prisma, filesStorageService as unknown as FilesStorageService);
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

    // avatarUrl is intentionally not settable through updateProfile/UpdateUserProfileDto (see
    // update-user-profile.dto.ts) — it's only ever written server-side via updateAvatar. These
    // tests seed avatarUrl directly through Prisma rather than through the service, to confirm
    // updateProfile leaves it untouched when only name is given.
    it('leaves an existing avatarUrl unchanged when only name is given', async () => {
      const email = `update-profile-partial-${Date.now()}@example.com`;
      const created = await service.create(email, 'password123');
      await prisma.user.update({
        where: { id: created.id },
        data: { avatarUrl: '/avatars/kept.png' },
      });

      const profile = await service.updateProfile(created.id, { name: 'Kept Name' });

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

  describe('updateAvatar', () => {
    it('saves the file and updates avatarUrl when the user has no existing avatar', async () => {
      const email = `update-avatar-new-${Date.now()}@example.com`;
      const created = await service.create(email, 'password123');

      const profile = await service.updateAvatar(
        created.id,
        fakeAvatarFile('3fa85f64-5717-4562-b3fc-2c963f66afa6.png'),
      );

      expect(profile.avatarUrl).toBe('/uploads/3fa85f64-5717-4562-b3fc-2c963f66afa6.png');
      expect(filesStorageService.deletedPaths).toEqual([]);
    });

    it('deletes the previous avatar file when replacing an existing avatar', async () => {
      const email = `update-avatar-replace-${Date.now()}@example.com`;
      const created = await service.create(email, 'password123');
      const previousFileName = '11111111-1111-1111-1111-111111111111.png';
      await prisma.user.update({
        where: { id: created.id },
        data: { avatarUrl: buildAvatarUrl(previousFileName) },
      });

      const profile = await service.updateAvatar(
        created.id,
        fakeAvatarFile('22222222-2222-2222-2222-222222222222.png'),
      );

      expect(profile.avatarUrl).toBe('/uploads/22222222-2222-2222-2222-222222222222.png');
      expect(filesStorageService.deletedPaths).toEqual([previousFileName]);
    });

    it('does not attempt to delete the previous avatar when it is not a recognized storage path', async () => {
      const email = `update-avatar-unrecognized-${Date.now()}@example.com`;
      const created = await service.create(email, 'password123');
      await prisma.user.update({
        where: { id: created.id },
        data: { avatarUrl: '/uploads/not-a-uuid.png' },
      });

      await service.updateAvatar(
        created.id,
        fakeAvatarFile('33333333-3333-3333-3333-333333333333.png'),
      );

      expect(filesStorageService.deletedPaths).toEqual([]);
    });

    it('deletes the just-saved file and throws NotFoundException when no user matches the id', async () => {
      await expect(
        service.updateAvatar(
          '00000000-0000-0000-0000-000000000000',
          fakeAvatarFile('44444444-4444-4444-4444-444444444444.png'),
        ),
      ).rejects.toThrow(NotFoundException);

      expect(filesStorageService.deletedPaths).toEqual([
        '44444444-4444-4444-4444-444444444444.png',
      ]);
    });

    it('deletes the just-saved file and rethrows when the profile update fails', async () => {
      const email = `update-avatar-db-failure-${Date.now()}@example.com`;
      const created = await service.create(email, 'password123');
      const dbError = new Error('db unavailable');
      jest.spyOn(prisma.user, 'update').mockRejectedValueOnce(dbError);

      await expect(
        service.updateAvatar(
          created.id,
          fakeAvatarFile('55555555-5555-5555-5555-555555555555.png'),
        ),
      ).rejects.toThrow(dbError);

      expect(filesStorageService.deletedPaths).toEqual([
        '55555555-5555-5555-5555-555555555555.png',
      ]);
    });
  });

  describe('changePassword', () => {
    it('updates the password when oldPassword matches the stored hash', async () => {
      const email = `change-password-ok-${Date.now()}@example.com`;
      const created = await service.create(email, 'oldpass123');

      await service.changePassword(created.id, 'oldpass123', 'newpass123');

      const updated = await service.findById(created.id);
      expect(updated?.password).not.toBe(created.password);
      await expect(bcrypt.compare('newpass123', updated!.password)).resolves.toBe(true);
    });

    it('throws BadRequestException when oldPassword does not match the stored hash', async () => {
      const email = `change-password-mismatch-${Date.now()}@example.com`;
      const created = await service.create(email, 'oldpass123');

      await expect(service.changePassword(created.id, 'wrongpass', 'newpass123')).rejects.toThrow(
        BadRequestException,
      );

      const unchanged = await service.findById(created.id);
      expect(unchanged?.password).toBe(created.password);
    });

    it('throws BadRequestException when newPassword is the same as oldPassword', async () => {
      const email = `change-password-same-${Date.now()}@example.com`;
      const created = await service.create(email, 'oldpass123');

      await expect(service.changePassword(created.id, 'oldpass123', 'oldpass123')).rejects.toThrow(
        BadRequestException,
      );

      const unchanged = await service.findById(created.id);
      expect(unchanged?.password).toBe(created.password);
    });

    it('throws NotFoundException when no user matches the id', async () => {
      await expect(
        service.changePassword('00000000-0000-0000-0000-000000000000', 'oldpass123', 'newpass123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the user is deleted between the lookup and the update', async () => {
      const email = `change-password-race-${Date.now()}@example.com`;
      const created = await service.create(email, 'oldpass123');
      jest.spyOn(prisma.user, 'update').mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '6.0.0',
        }),
      );

      await expect(service.changePassword(created.id, 'oldpass123', 'newpass123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
