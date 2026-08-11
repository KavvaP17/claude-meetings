'use client';

import { ApiError, registerUser } from '@/lib/api/auth';
import {
  Button,
  Card,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  Link,
  TextField,
} from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="20"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="20"
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.94 10.94 0 0 1 12 5c7 0 11 8 11 8a13.2 13.2 0 0 1-3.15 4.06M6.61 6.61A13.5 13.2 0 0 0 1 12s4 8 11 8a10.9 10.9 0 0 0 5.39-1.61" />
      <path d="M2 2l20 20" />
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');

    setIsSubmitting(true);
    try {
      const { accessToken } = await registerUser({ email, password });
      localStorage.setItem('accessToken', accessToken);
      router.push('/');
    } catch (error) {
      setFormError(
        error instanceof ApiError && error.status === 409
          ? 'An account with this email already exists.'
          : error instanceof ApiError
            ? error.message
            : 'Something went wrong. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <Card className="w-full max-w-md">
        <Card.Header>
          <Card.Title>Create an account</Card.Title>
          <Card.Description>Sign up with your email and a password</Card.Description>
        </Card.Header>
        <Form onSubmit={handleSubmit}>
          <Card.Content>
            <div className="flex flex-col gap-4">
              <TextField
                isRequired
                autoComplete="email"
                name="email"
                type="email"
                validate={(value) =>
                  EMAIL_PATTERN.test(value) ? null : 'Please enter a valid email address'
                }
              >
                <Label>Email</Label>
                <Input className="min-h-11" placeholder="you@example.com" variant="secondary" />
                <FieldError />
              </TextField>

              <TextField
                isRequired
                autoComplete="new-password"
                minLength={8}
                name="password"
                type={isPasswordVisible ? 'text' : 'password'}
                validate={(value) =>
                  value.length >= 8 ? null : 'Password must be at least 8 characters'
                }
              >
                <Label>Password</Label>
                <div className="relative">
                  <Input className="min-h-11 pe-10" placeholder="••••••••" variant="secondary" />
                  <Button
                    isIconOnly
                    aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                    className="absolute end-1 top-1/2 -translate-y-1/2"
                    size="sm"
                    variant="ghost"
                    onPress={() => setIsPasswordVisible((visible) => !visible)}
                  >
                    {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
                  </Button>
                </div>
                <Description>Must be at least 8 characters</Description>
                <FieldError />
              </TextField>

              {formError ? (
                <p className="text-sm text-danger" role="alert">
                  {formError}
                </p>
              ) : null}
            </div>
          </Card.Content>
          <Card.Footer className="mt-4 flex flex-col gap-3">
            <Button className="w-full" isPending={isSubmitting} size="lg" type="submit">
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </Button>
            <p className="text-center text-sm text-muted">
              Already have an account? <Link href="/login">Sign in</Link>
            </p>
          </Card.Footer>
        </Form>
      </Card>
    </div>
  );
}
