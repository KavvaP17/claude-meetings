'use client';

import { API_URL, ApiError } from '@/lib/api/client';
import { getMeetings, type Meeting } from '@/lib/api/meetings';
import { getCurrentUser, initialsFor, type UserProfile } from '@/lib/api/users';
import { useRequireSession } from '@/lib/auth/useRequireSession';
import { Avatar, Button, Card, Spinner } from '@heroui/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default function Home() {
  const router = useRouter();
  const { session, logout } = useRequireSession();
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!session) return;
    getMeetings(session.accessToken)
      .then(setMeetings)
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          logout();
          return;
        }
        setLoadError(error instanceof ApiError ? error.message : 'Failed to load meetings.');
      });
  }, [session, logout]);

  useEffect(() => {
    if (!session) return;

    const loadProfile = () => {
      getCurrentUser(session.accessToken)
        .then(setProfile)
        .catch((error: unknown) => {
          if (error instanceof ApiError && error.status === 401) {
            logout();
            return;
          }
          console.error('Failed to load profile.', error);
        });
    };

    loadProfile();

    // There's no in-app link back to "/" from /profile or /profile/edit, so the browser's
    // Back button is the only way to return here. Next.js's client-side router cache can
    // restore this page's previous instance on that back navigation without re-running this
    // effect, which would otherwise leave the header showing the pre-edit profile. The JWT
    // itself never changes, so `session` can't be used to detect that an edit happened —
    // popstate is what actually signals "the user navigated back to /".
    const handlePopState = () => {
      if (window.location.pathname === '/') {
        loadProfile();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [session, logout]);

  if (!session) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner aria-label="Checking session" size="lg" />
      </div>
    );
  }

  const recentMeetings = meetings
    ? [...meetings]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3)
    : [];

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <Link
            className="-mx-2 -my-1 flex min-w-0 items-center gap-3 rounded-lg px-2 py-1 hover:bg-muted/10 focus-visible:status-focused"
            href="/profile"
          >
            <Avatar size="md">
              {profile?.avatarUrl ? (
                <Avatar.Image src={`${API_URL}${profile.avatarUrl}`} alt="" />
              ) : null}
              <Avatar.Fallback>
                {profile ? initialsFor(profile) : session.email.charAt(0).toUpperCase()}
              </Avatar.Fallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-foreground">Welcome back</h1>
              <p className="truncate text-muted">
                {profile?.name ?? profile?.email ?? session.email}
              </p>
            </div>
          </Link>
          <Button variant="outline" onPress={logout}>
            Log out
          </Button>
        </header>

        <Card>
          <Card.Header>
            <Card.Title>Meetings</Card.Title>
            <Card.Description>
              {meetings === null
                ? 'Loading...'
                : `${meetings.length} meeting${meetings.length === 1 ? '' : 's'} total`}
            </Card.Description>
          </Card.Header>
          <Card.Content>
            {loadError ? (
              <p className="text-sm text-danger" role="alert">
                {loadError}
              </p>
            ) : meetings === null ? (
              <div className="flex items-center justify-center py-8">
                <Spinner aria-label="Loading meetings" />
              </div>
            ) : recentMeetings.length === 0 ? (
              <p className="text-sm text-muted">No meetings yet. Create your first one below.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {recentMeetings.map((meeting) => (
                  <li key={meeting.id}>
                    <Link
                      className="flex items-center justify-between gap-4 py-3 hover:bg-muted/10"
                      href={`/meetings/${meeting.id}`}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{meeting.title}</p>
                        <p className="text-sm text-muted">
                          {dateFormatter.format(new Date(meeting.date))}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm text-muted">
                        {meeting.participants.length} participant
                        {meeting.participants.length === 1 ? '' : 's'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card.Content>
          <Card.Footer>
            <Button className="w-full" size="lg" onPress={() => router.push('/meetings/new')}>
              Create meeting
            </Button>
          </Card.Footer>
        </Card>
      </div>
    </div>
  );
}
