'use client';

import { ApiError } from '@/lib/api/client';
import { getCurrentUser, type UserProfile } from '@/lib/api/users';
import type { Session } from '@/lib/auth/session';
import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';

export interface UseProfileResult {
  profile: UserProfile | null;
  setProfile: Dispatch<SetStateAction<UserProfile | null>>;
  loadError: string | null;
}

// Shared by `/`, `/profile`, and `/profile/edit` — all three loaded the profile via
// getCurrentUser and handled a 401 by calling logout() in slightly different variants
// (see issue #78). setProfile is exposed so callers that mutate the profile themselves
// (name/avatar saves in `/profile/edit`) can update it after a successful write.
export function useProfile(session: Session | null, logout: () => void): UseProfileResult {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    getCurrentUser(session.accessToken)
      .then(setProfile)
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          logout();
          return;
        }
        setLoadError(error instanceof ApiError ? error.message : 'Failed to load profile.');
      });
  }, [session, logout]);

  return { profile, setProfile, loadError };
}
