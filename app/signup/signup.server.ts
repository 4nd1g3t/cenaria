'use server';
import { cookies } from 'next/headers';
import { AuthActionState, API_URL } from '@/lib/config/constants';

type SignUpBody = { email: string; password: string; fullName: string };
type SignInResponse = { idToken?: string; refreshToken?: string; expiresIn?: number; tokenType?: string };

export async function signUpAction(
  prev: AuthActionState, 
  formData: FormData
): Promise<AuthActionState> {
  const fullName = String(formData.get('fullName') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const next = (formData.get('next') as string) || '/pantry';
  try {
    // 1) signup
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, fullName } as SignUpBody),
      cache: 'no-store',
    });
    if (!res.ok) {
      const status = res.status;
      let msg = 'Error creando la cuenta';
      try { const j = (await res.json()) as { message?: string }; if (j?.message) msg = j.message; } catch {}
      return { ok: false, error: { code: 'SIGNUP', message: msg, status } };
    }

    // 2) auto-signin
    const resSignIn = await fetch(`${API_URL}/auth/signin`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    }); 
    if (!resSignIn.ok) return { ok: true, next: `/signin?next=${encodeURIComponent(next)}` };
    const data = (await resSignIn.json()) as SignInResponse;
    if (!data.idToken) return { ok: true, next: `/signin?next=${encodeURIComponent(next)}` };
    const jar = await cookies();
    jar.set('idToken', data.idToken, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
    if (data.refreshToken) {
      jar.set('refreshToken', data.refreshToken, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
    }
    jar.set('email', email, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
    return { ok: true, next: next || "/pantry" };
  } catch (err) {
    const status = (err as { status?: number })?.status;
    const message = (err as { message?: string })?.message ?? 'Error de red';
    return { ok: false, error: { code: 'NETWORK', message, status } };
  }
}
