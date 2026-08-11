import { apiFetch } from './client';

export interface Meeting {
  id: string;
  title: string;
  date: string;
  participants: string[];
  createdAt: string;
}

export interface CreateMeetingPayload {
  title: string;
  date: string;
  participants: string[];
}

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

export function getMeetings(accessToken: string): Promise<Meeting[]> {
  return apiFetch<Meeting[]>(
    '/meetings',
    { headers: authHeaders(accessToken) },
    'Failed to load meetings.',
  );
}

export function createMeeting(
  accessToken: string,
  payload: CreateMeetingPayload,
): Promise<Meeting> {
  return apiFetch<Meeting>(
    '/meetings',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify(payload),
    },
    'Failed to create meeting.',
  );
}
