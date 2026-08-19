// No signature verification here — the token was just issued by our own login/register call;
// this only reads the `sub` claim for client-side UI (isCreator), the server re-verifies on every request.
export function decodeAccessTokenSub(accessToken: string): string | null {
  const payload = accessToken.split('.')[1];
  if (!payload) return null;

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const decoded: unknown = JSON.parse(atob(padded));
    const sub = decoded && typeof decoded === 'object' ? (decoded as { sub?: unknown }).sub : null;
    return typeof sub === 'string' ? sub : null;
  } catch {
    return null;
  }
}
