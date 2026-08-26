'use client';

import { API_URL, ApiError } from '@/lib/api/client';
import { getCurrentUser, initialsFor, type UserProfile } from '@/lib/api/users';
import { useRequireSession } from '@/lib/auth/useRequireSession';
import { Avatar, Button, Card, Spinner } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default function ProfilePage() {
  const router = useRouter();
  const { session, logout } = useRequireSession();
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

  if (!session) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner aria-label="Checking session" size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="flex w-full max-w-md flex-col gap-6">
        {loadError ? (
          <p className="text-sm text-danger" role="alert">
            {loadError}
          </p>
        ) : profile === null ? (
          <div className="flex items-center justify-center py-16">
            <Spinner aria-label="Loading profile" size="lg" />
          </div>
        ) : (
          <Card>
            <Card.Header className="flex-row items-center gap-4">
              <Avatar size="lg">
                {profile.avatarUrl ? (
                  <Avatar.Image src={`${API_URL}${profile.avatarUrl}`} alt="" />
                ) : null}
                <Avatar.Fallback>{initialsFor(profile)}</Avatar.Fallback>
              </Avatar>
              <div>
                <Card.Title>{profile.name ?? profile.email}</Card.Title>
                {profile.name ? <Card.Description>{profile.email}</Card.Description> : null}
              </div>
            </Card.Header>
            <Card.Content>
              <p className="text-sm text-muted">
                Member since {dateFormatter.format(new Date(profile.createdAt))}
              </p>
            </Card.Content>
            <Card.Footer>
              <Button
                className="w-full"
                onPress={() => router.push('/profile/edit')}
                variant="outline"
              >
                Edit profile
              </Button>
            </Card.Footer>
          </Card>
        )}
      </div>
    </div>
  );
}
