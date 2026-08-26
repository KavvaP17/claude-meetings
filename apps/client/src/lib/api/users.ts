import { apiFetch } from './client';

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

export function getCurrentUser(accessToken: string): Promise<UserProfile> {
  return apiFetch<UserProfile>(
    '/users/me',
    { headers: authHeaders(accessToken) },
    'Failed to load profile.',
  );
}
