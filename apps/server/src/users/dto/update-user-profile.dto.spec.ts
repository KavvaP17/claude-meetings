import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateUserProfileDto } from './update-user-profile.dto';

async function validateDto(payload: object) {
  const dto = plainToInstance(UpdateUserProfileDto, payload);
  return validate(dto);
}

describe('UpdateUserProfileDto', () => {
  it('passes validation with no fields set', async () => {
    const errors = await validateDto({});

    expect(errors).toHaveLength(0);
  });

  it('passes validation with only name set', async () => {
    const errors = await validateDto({ name: 'Alice' });

    expect(errors).toHaveLength(0);
  });

  it('fails validation when name is not a string', async () => {
    const errors = await validateDto({ name: 123 });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('name');
  });

  it('fails validation when name is an empty string', async () => {
    const errors = await validateDto({ name: '' });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('name');
  });

  it('fails validation when name is whitespace-only', async () => {
    const errors = await validateDto({ name: '   ' });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('name');
  });

  it('fails validation when name is null', async () => {
    const errors = await validateDto({ name: null });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('name');
  });

  it('passes validation when an avatarUrl field is supplied (not part of this DTO)', async () => {
    // avatarUrl is deliberately not a field on this DTO (see update-user-profile.dto.ts) — the
    // global ValidationPipe's `whitelist: true` strips it before it ever reaches the controller.
    const errors = await validateDto({ avatarUrl: '@evil.example/x.png' });

    expect(errors).toHaveLength(0);
  });
});
