'use client';

import { ApiError } from '@/lib/api/client';
import { createMeeting } from '@/lib/api/meetings';
import { useRequireSession } from '@/lib/auth/useRequireSession';
import {
  Button,
  Card,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
} from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export default function NewMeetingPage() {
  const router = useRouter();
  const { session } = useRequireSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get('title') ?? '').trim();
    const date = String(formData.get('date') ?? '');
    const participants = String(formData.get('participants') ?? '')
      .split(',')
      .map((participant) => participant.trim())
      .filter(Boolean);

    setIsSubmitting(true);
    try {
      await createMeeting(session.accessToken, {
        title,
        date: new Date(date).toISOString(),
        participants,
      });
      router.push('/');
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <Card className="w-full max-w-md">
        <Card.Header>
          <Card.Title>Create meeting</Card.Title>
          <Card.Description>Schedule a new meeting</Card.Description>
        </Card.Header>
        <Form onSubmit={handleSubmit}>
          <Card.Content>
            <div className="flex flex-col gap-4">
              <TextField isRequired name="title" type="text">
                <Label>Title</Label>
                <Input className="min-h-11" placeholder="Sprint planning" variant="secondary" />
                <FieldError />
              </TextField>

              <TextField isRequired name="date" type="datetime-local">
                <Label>Date &amp; time</Label>
                <Input className="min-h-11" variant="secondary" />
                <FieldError />
              </TextField>

              <TextField name="participants" type="text">
                <Label>Participants</Label>
                <Input
                  className="min-h-11"
                  placeholder="jane@example.com, john@example.com"
                  variant="secondary"
                />
                <Description>Comma-separated, optional</Description>
                <FieldError />
              </TextField>

              {formError ? (
                <p className="text-sm text-danger" role="alert">
                  {formError}
                </p>
              ) : null}
            </div>
          </Card.Content>
          <Card.Footer className="mt-4 flex flex-col gap-3 sm:flex-row-reverse">
            <Button className="w-full" isPending={isSubmitting} size="lg" type="submit">
              {isSubmitting ? 'Creating...' : 'Create meeting'}
            </Button>
            <Button
              className="w-full"
              isDisabled={isSubmitting}
              size="lg"
              variant="outline"
              onPress={() => router.push('/')}
            >
              Cancel
            </Button>
          </Card.Footer>
        </Form>
      </Card>
    </div>
  );
}
