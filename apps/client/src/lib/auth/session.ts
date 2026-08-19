import { decodeAccessTokenSub } from './jwt';

const ACCESS_TOKEN_KEY = 'accessToken';
const EMAIL_KEY = 'userEmail';
const USER_ID_KEY = 'userId';

export interface Session {
  email: string;
  accessToken: string;
  userId: string;
}

export function setSession(session: { email: string; accessToken: string }): void {
  const userId = decodeAccessTokenSub(session.accessToken) ?? '';
  localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  localStorage.setItem(EMAIL_KEY, session.email);
  localStorage.setItem(USER_ID_KEY, userId);
}

export function getSession(): Session | null {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const email = localStorage.getItem(EMAIL_KEY);
  const userId = localStorage.getItem(USER_ID_KEY);
  if (!accessToken || !email || !userId) return null;
  return { accessToken, email, userId };
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
  localStorage.removeItem(USER_ID_KEY);
}
