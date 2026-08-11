const ACCESS_TOKEN_KEY = 'accessToken';
const EMAIL_KEY = 'userEmail';

export interface Session {
  email: string;
  accessToken: string;
}

export function setSession(session: Session): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  localStorage.setItem(EMAIL_KEY, session.email);
}

export function getSession(): Session | null {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const email = localStorage.getItem(EMAIL_KEY);
  if (!accessToken || !email) return null;
  return { accessToken, email };
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
}
