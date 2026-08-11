import { apiFetch, ApiError } from './client';

export interface AuthPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
}

export { ApiError };

export function registerUser(payload: AuthPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>(
    '/auth/register',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Registration failed.',
  );
}

export function loginUser(payload: AuthPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>(
    '/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Login failed.',
  );
}
