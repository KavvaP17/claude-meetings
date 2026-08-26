import { apiFetch, authHeaders } from './client';

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export function getCurrentUser(accessToken: string): Promise<UserProfile> {
  return apiFetch<UserProfile>(
    '/users/me',
    { headers: authHeaders(accessToken) },
    'Failed to load profile.',
  );
}
