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

  it('passes validation with only avatarUrl set', async () => {
    const errors = await validateDto({ avatarUrl: '/uploads/avatar.png' });

    expect(errors).toHaveLength(0);
  });

  it('passes validation with both fields set', async () => {
    const errors = await validateDto({ name: 'Alice', avatarUrl: '/uploads/avatar.png' });

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

  it('fails validation when avatarUrl is not a string', async () => {
    const errors = await validateDto({ avatarUrl: 123 });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('avatarUrl');
  });
});
