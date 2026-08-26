'use client';

import { API_URL, ApiError } from '@/lib/api/client';
import {
  validateAvatarFile,
  ALLOWED_AVATAR_MIME_TYPES,
  MAX_AVATAR_SIZE_BYTES,
} from '@/lib/api/avatar-file-validation';
import { getCurrentUser, updateProfile, uploadAvatar, type UserProfile } from '@/lib/api/users';
import { useRequireSession } from '@/lib/auth/useRequireSession';
import { formatFileSize } from '@/lib/format';
import {
  Avatar,
  Button,
  Card,
  FieldError,
  Form,
  Input,
  Label,
  Spinner,
  TextField,
} from '@heroui/react';
import { useRouter } from 'next/navigation';
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from 'react';

function initialsFor(profile: UserProfile): string {
  const source = profile.name?.trim() || profile.email;
  return source.charAt(0).toUpperCase();
}

export default function EditProfilePage() {
  const router = useRouter();
  const { session, logout } = useRequireSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSaved, setAvatarSaved] = useState(false);

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

  // Revokes the previous preview URL whenever it's replaced or the component unmounts, so
  // selecting several files in a row (or leaving the page) doesn't leak object URLs.
  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const applySelectedAvatarFile = (file: File | undefined) => {
    if (!file) return;
    const validationError = validateAvatarFile(file);
    if (validationError) {
      setAvatarError(validationError);
      return;
    }
    setAvatarError(null);
    setAvatarSaved(false);
    setAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
  };

  const handleAvatarInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    applySelectedAvatarFile(file);
  };

  const handleAvatarDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingAvatar(false);
    applySelectedAvatarFile(event.dataTransfer.files?.[0]);
  };

  const handleAvatarSave = async () => {
    if (!session || !avatarFile) return;
    setAvatarError(null);
    setIsSavingAvatar(true);
    try {
      const updated = await uploadAvatar(session.accessToken, avatarFile);
      setProfile(updated);
      setAvatarSaved(true);
      setAvatarFile(null);
      setAvatarPreviewUrl(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        return;
      }
      setAvatarError(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setIsSavingAvatar(false);
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
          <>
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

            <Card>
              <Card.Header>
                <Card.Title>Avatar</Card.Title>
                <Card.Description>Upload a new profile picture</Card.Description>
              </Card.Header>
              <Card.Content>
                <div className="flex flex-col gap-4">
                  <input
                    ref={avatarInputRef}
                    aria-label="Choose an avatar image"
                    accept={ALLOWED_AVATAR_MIME_TYPES.join(',')}
                    className="sr-only"
                    disabled={isSavingAvatar}
                    tabIndex={-1}
                    type="file"
                    onChange={handleAvatarInputChange}
                  />
                  <div
                    className={`flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                      isDraggingAvatar
                        ? 'border-accent bg-accent/5'
                        : 'border-border hover:border-accent'
                    }`}
                    aria-label="Choose or drop an avatar image"
                    role="button"
                    tabIndex={0}
                    onClick={() => avatarInputRef.current?.click()}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsDraggingAvatar(true);
                    }}
                    onDragLeave={() => setIsDraggingAvatar(false)}
                    onDrop={handleAvatarDrop}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        avatarInputRef.current?.click();
                      }
                    }}
                  >
                    <Avatar size="lg">
                      {avatarPreviewUrl ? (
                        <Avatar.Image src={avatarPreviewUrl} alt="" />
                      ) : profile.avatarUrl ? (
                        <Avatar.Image src={`${API_URL}${profile.avatarUrl}`} alt="" />
                      ) : null}
                      <Avatar.Fallback>{initialsFor(profile)}</Avatar.Fallback>
                    </Avatar>
                    <p className="text-sm text-foreground">
                      Drag and drop an image here, or click to browse
                    </p>
                    <p className="text-xs text-muted">
                      JPEG, PNG, or WebP, up to {formatFileSize(MAX_AVATAR_SIZE_BYTES)}
                    </p>
                  </div>

                  {avatarError ? (
                    <p className="text-sm text-danger" role="alert">
                      {avatarError}
                    </p>
                  ) : null}
                  {avatarSaved ? (
                    <p className="text-sm text-success" role="status">
                      Avatar saved.
                    </p>
                  ) : null}
                </div>
              </Card.Content>
              <Card.Footer>
                <Button
                  className="w-full"
                  isDisabled={!avatarFile}
                  isPending={isSavingAvatar}
                  onPress={handleAvatarSave}
                >
                  {isSavingAvatar ? 'Saving...' : 'Save avatar'}
                </Button>
              </Card.Footer>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
