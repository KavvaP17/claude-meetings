export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const { message } = body as { message: unknown };
    if (typeof message === 'string') return message;
    if (Array.isArray(message) && message.every((m) => typeof m === 'string')) {
      return message.join(' ');
    }
  }
  return fallback;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit,
  fallbackError: string,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new ApiError('Unable to reach the server. Please try again.', 0);
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(body, fallbackError), response.status);
  }

  return body as T;
}
