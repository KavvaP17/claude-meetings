'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { clearSession, getSession, type Session } from './session';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getServerSnapshot(): Session | null {
  return null;
}

// useSyncExternalStore requires a stable (===) return value when the underlying
// data hasn't changed, but getSession() builds a fresh object every call.
let cachedSession: Session | null = null;

function getClientSnapshot(): Session | null {
  const next = getSession();
  const isSameAsCached =
    (next === null && cachedSession === null) ||
    (next !== null &&
      cachedSession !== null &&
      next.accessToken === cachedSession.accessToken &&
      next.email === cachedSession.email);
  if (!isSameAsCached) {
    cachedSession = next;
  }
  return cachedSession;
}

export function useRequireSession() {
  const router = useRouter();
  const session = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!session) {
      router.replace('/login');
    }
  }, [session, router]);

  const logout = useCallback(() => {
    clearSession();
    router.replace('/login');
  }, [router]);

  return { session, logout };
}
