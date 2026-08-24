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
});
