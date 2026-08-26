import { apiFetch, authHeaders } from './client';

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface UpdateProfilePayload {
  name?: string;
  avatarUrl?: string;
}

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

export function getCurrentUser(accessToken: string): Promise<UserProfile> {
  return apiFetch<UserProfile>(
    '/users/me',
    { headers: authHeaders(accessToken) },
    'Failed to load profile.',
  );
}

export function updateProfile(
  accessToken: string,
  payload: UpdateProfilePayload,
): Promise<UserProfile> {
  return apiFetch<UserProfile>(
    '/users/me',
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify(payload),
    },
    'Failed to update profile.',
  );
}

export function uploadAvatar(accessToken: string, file: File): Promise<UserProfile> {
  const formData = new FormData();
  formData.append('avatar', file);

  return apiFetch<UserProfile>(
    '/users/me/avatar',
    {
      method: 'POST',
      // Content-Type intentionally not set — the browser fills in multipart/form-data with the
      // correct boundary for a FormData body; setting it manually would drop the boundary.
      headers: authHeaders(accessToken),
      body: formData,
    },
    'Failed to upload avatar.',
  );
}

export function changePassword(accessToken: string, payload: ChangePasswordPayload): Promise<void> {
  return apiFetch<void>(
    '/users/me/change-password',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify(payload),
    },
    'Failed to change password.',
  );
}
