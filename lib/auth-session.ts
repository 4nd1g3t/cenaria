import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.cenaria.app';

export type ApiStatusError = { status?: number; response?: { status?: number }; message?: string };

export function extractStatus(e: unknown): number | undefined {
  return (e as ApiStatusError)?.status ?? (e as ApiStatusError)?.response?.status;
}

function normalizeMessage(e: unknown): string {
  const raw =
    (e as { message?: string })?.message ??
    String(e ?? '');
  return raw.toLowerCase();
}

/** Heurística amplia para decidir si amerita intentar refresh. */
export function shouldAttemptRefresh(e: unknown): boolean {
  const code = extractStatus(e);
  if (code === 401 || code === 403) return true;
  const msg = normalizeMessage(e);
  // Casos comunes: "401 Unauthorized {...}", "unauthorized", "not authorized",
  // "token expired/invalid", "jwt expired/invalid"
  if (/\b401\b/.test(msg)) return true;
  if (msg.includes('unauthorized') || msg.includes('not authorized')) return true;
  if (msg.includes('token') && (msg.includes('expired') || msg.includes('invalid'))) return true;
  if (msg.includes('jwt') && (msg.includes('expired') || msg.includes('invalid'))) return true;
  return false;
}

export async function readSessionCookies() {
  const jar = await cookies();
  const idToken =
    jar.get('idToken')?.value ||
    jar.get('id_token')?.value ||
    jar.get('cenaria.idToken')?.value;
  const refreshToken = jar.get('refreshToken')?.value || null;
  const email = jar.get('email')?.value || jar.get('userEmail')?.value || null;
  return { idToken, refreshToken, email };
}

export async function ensureIdTokenOrRedirect(nextPath: string = '/despensa'): Promise<string> {
  const { idToken } = await readSessionCookies();
  if (!idToken) redirect(`/signin?next=${encodeURIComponent(nextPath)}`);
  return idToken!;
}

export async function refreshSession(): Promise<string | null> {
  const jar = await cookies();
  const refreshToken = jar.get('refreshToken')?.value;
  const email = jar.get('email')?.value || jar.get('userEmail')?.value;
  if (!refreshToken || !email) return null;

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, refreshToken }),
    cache: 'no-store',
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { idToken?: string; expiresIn?: number };
  const newId = data.idToken;
  if (!newId) return null;

  jar.set('idToken', newId, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
  return newId;
}

/** Ejecuta `op` con idToken; si falla con 401/403 (o mensaje equivalente) intenta refresh y reintenta una vez. */
export async function attemptWithRefresh<T>(
  nextPath: string,
  op: (idToken: string) => Promise<T>
): Promise<T> {
  const id = await ensureIdTokenOrRedirect(nextPath);
  try {
    return await op(id);
  } catch (e) {
    if (shouldAttemptRefresh(e)) {
      const newId = await refreshSession();
      if (!newId) redirect(`/signin?next=${encodeURIComponent(nextPath)}`);
      return await op(newId!);
    }
    throw e;
  }
}
