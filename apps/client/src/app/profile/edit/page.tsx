'use client';

import { ApiError } from '@/lib/api/client';
import { getCurrentUser, updateProfile, type UserProfile } from '@/lib/api/users';
import { useRequireSession } from '@/lib/auth/useRequireSession';
import { Button, Card, FieldError, Form, Input, Label, Spinner, TextField } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

export default function EditProfilePage() {
  const router = useRouter();
  const { session, logout } = useRequireSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);

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

  const handleNameSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;
    setNameError(null);
    setNameSaved(false);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '').trim();

    setIsSavingName(true);
    try {
      const updated = await updateProfile(session.accessToken, { name });
      setProfile(updated);
      setNameSaved(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        return;
      }
      setNameError(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setIsSavingName(false);
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Edit profile</h1>
          <Button size="sm" variant="outline" onPress={() => router.push('/profile')}>
            Back to profile
          </Button>
        </div>

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
            <Card.Header>
              <Card.Title>Name</Card.Title>
              <Card.Description>Update the name shown on your profile</Card.Description>
            </Card.Header>
            <Form onSubmit={handleNameSubmit}>
              <Card.Content>
                <div className="flex flex-col gap-4">
                  <TextField defaultValue={profile.name ?? ''} name="name" type="text">
                    <Label>Name</Label>
                    <Input className="min-h-11" placeholder="Jane Doe" variant="secondary" />
                    <FieldError />
                  </TextField>

                  {nameError ? (
                    <p className="text-sm text-danger" role="alert">
                      {nameError}
                    </p>
                  ) : null}
                  {nameSaved ? (
                    <p className="text-sm text-success" role="status">
                      Name saved.
                    </p>
                  ) : null}
                </div>
              </Card.Content>
              <Card.Footer>
                <Button className="w-full" isPending={isSavingName} type="submit">
                  {isSavingName ? 'Saving...' : 'Save name'}
                </Button>
              </Card.Footer>
            </Form>
          </Card>
        )}
      </div>
    </div>
  );
}
