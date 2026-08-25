import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ChangePasswordDto } from './change-password.dto';

async function validateDto(payload: object) {
  const dto = plainToInstance(ChangePasswordDto, payload);
  return validate(dto);
}

describe('ChangePasswordDto', () => {
  it('passes validation with valid oldPassword and newPassword', async () => {
    const errors = await validateDto({ oldPassword: 'oldpass123', newPassword: 'newpass123' });

    expect(errors).toHaveLength(0);
  });

  it('fails validation when oldPassword is missing', async () => {
    const errors = await validateDto({ newPassword: 'newpass123' });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('oldPassword');
  });

  it('fails validation when oldPassword is not a string', async () => {
    const errors = await validateDto({ oldPassword: 123, newPassword: 'newpass123' });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('oldPassword');
  });

  it('fails validation when oldPassword is shorter than 8 characters', async () => {
    const errors = await validateDto({ oldPassword: 'short', newPassword: 'newpass123' });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('oldPassword');
  });

  it('fails validation when newPassword is missing', async () => {
    const errors = await validateDto({ oldPassword: 'oldpass123' });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('newPassword');
  });

  it('fails validation when newPassword is not a string', async () => {
    const errors = await validateDto({ oldPassword: 'oldpass123', newPassword: 123 });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('newPassword');
  });

  it('fails validation when newPassword is shorter than 8 characters', async () => {
    const errors = await validateDto({ oldPassword: 'oldpass123', newPassword: 'short' });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('newPassword');
  });
});
