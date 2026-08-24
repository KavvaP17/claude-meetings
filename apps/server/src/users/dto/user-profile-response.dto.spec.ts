import { User } from '@prisma/client';
import { toUserProfileResponseDto } from './user-profile-response.dto';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'user@example.com',
    password: 'hashed-password',
    name: null,
    avatarUrl: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('toUserProfileResponseDto', () => {
  it('maps id, email, name, avatarUrl and createdAt', () => {
    const user = buildUser({ id: 'user-2', name: 'Alice', avatarUrl: '/uploads/avatar.png' });

    const dto = toUserProfileResponseDto(user);

    expect(dto).toEqual({
      id: 'user-2',
      email: 'user@example.com',
      name: 'Alice',
      avatarUrl: '/uploads/avatar.png',
      createdAt: user.createdAt,
    });
  });

  it('never includes the password field', () => {
    const dto = toUserProfileResponseDto(buildUser());

    expect(Object.keys(dto)).not.toContain('password');
  });
});
