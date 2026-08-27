import { API_URL, apiFetch, authHeaders } from './client';

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface UpdateProfilePayload {
  name?: string;
}

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

// Array.from (not .charAt(0)) so a name/email starting with an astral-plane character (most
// emoji) yields the full code point instead of a lone UTF-16 surrogate half.
export function initialsFor(profile: Pick<UserProfile, 'name' | 'email'>): string {
  const source = profile.name?.trim() || profile.email;
  return Array.from(source)[0]?.toUpperCase() ?? '';
}

// avatarUrl is a path relative to the API origin, not the client's — every page rendering an
// avatar needs to resolve it against API_URL before handing it to <Avatar.Image>.
export function avatarSrcFor(profile: Pick<UserProfile, 'avatarUrl'>): string | null {
  return profile.avatarUrl ? `${API_URL}${profile.avatarUrl}` : null;
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
