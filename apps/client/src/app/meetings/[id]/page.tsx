'use client';

import { ApiError } from '@/lib/api/client';
import { getMeeting, type MeetingWithFiles } from '@/lib/api/meetings';
import { useRequireSession } from '@/lib/auth/useRequireSession';
import { Button, Card, Chip, Spinner } from '@heroui/react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const FILE_STATUS_COLORS: Record<string, 'success' | 'warning' | 'danger'> = {
  UPLOADED: 'success',
};

function fileStatusColor(status: string): 'success' | 'warning' | 'danger' | 'default' {
  return FILE_STATUS_COLORS[status] ?? 'default';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = -1;
  do {
    value /= 1024;
    unitIndex++;
  } while (value >= 1024 && unitIndex < units.length - 1);
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export default function MeetingDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { session, logout } = useRequireSession();
  const [meeting, setMeeting] = useState<MeetingWithFiles | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    getMeeting(session.accessToken, id)
      .then(setMeeting)
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          logout();
          return;
        }
        if (error instanceof ApiError && error.status === 404) {
          setNotFound(true);
          return;
        }
        setLoadError(error instanceof ApiError ? error.message : 'Failed to load meeting.');
      });
  }, [session, id, logout]);

  if (!session) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner aria-label="Checking session" size="lg" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
        <Card className="w-full max-w-md">
          <Card.Header>
            <Card.Title>Meeting not found</Card.Title>
            <Card.Description>
              This meeting doesn&apos;t exist or may have been removed.
            </Card.Description>
          </Card.Header>
          <Card.Footer>
            <Button className="w-full" onPress={() => router.push('/')}>
              Back to meetings
            </Button>
          </Card.Footer>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <Button className="w-fit" variant="ghost" onPress={() => router.push('/')}>
          ← Back to meetings
        </Button>

        {loadError ? (
          <p className="text-sm text-danger" role="alert">
            {loadError}
          </p>
        ) : meeting === null ? (
          <div className="flex items-center justify-center py-16">
            <Spinner aria-label="Loading meeting" size="lg" />
          </div>
        ) : (
          <>
            <Card>
              <Card.Header>
                <Card.Title>{meeting.title}</Card.Title>
                <Card.Description>{dateFormatter.format(new Date(meeting.date))}</Card.Description>
              </Card.Header>
              <Card.Content>
                <p className="mb-2 text-sm font-medium text-foreground">
                  Participants ({meeting.participants.length})
                </p>
                {meeting.participants.length === 0 ? (
                  <p className="text-sm text-muted">No participants added.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {meeting.participants.map((participant) => (
                      <Chip key={participant}>{participant}</Chip>
                    ))}
                  </div>
                )}
              </Card.Content>
            </Card>

            <Card>
              <Card.Header>
                <Card.Title>Files</Card.Title>
                <Card.Description>
                  {meeting.files.length} file{meeting.files.length === 1 ? '' : 's'} attached
                </Card.Description>
              </Card.Header>
              <Card.Content>
                {meeting.files.length === 0 ? (
                  <p className="text-sm text-muted">No files yet.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-border">
                    {meeting.files.map((file) => (
                      <li key={file.id} className="flex items-center justify-between gap-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{file.fileName}</p>
                          <p className="text-sm text-muted">
                            {formatFileSize(file.sizeBytes)} ·{' '}
                            {dateFormatter.format(new Date(file.createdAt))}
                          </p>
                        </div>
                        <Chip className="shrink-0" color={fileStatusColor(file.status)}>
                          {file.status}
                        </Chip>
                      </li>
                    ))}
                  </ul>
                )}
              </Card.Content>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
