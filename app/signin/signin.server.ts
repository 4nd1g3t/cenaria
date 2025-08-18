'use server';

import { cookies } from 'next/headers';

export type AuthActionError = { code: string; message: string; status?: number };
export type AuthActionState = { ok: boolean; next?: string; error?: AuthActionError };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.cenaria.app';

export async function signInAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const fullName = (formData.get('fullName') as string) || undefined;
  const next = (formData.get('next') as string) || '/despensa';

  if (!email || !password) return { ok: false, error: { code: 'VALIDATION', message: 'Correo y contraseña son requeridos' } };

  try {
    const res = await fetch(`${API_URL}/auth/signin`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, fullName }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const status = res.status;
      let msg = 'Error de autenticación';
      try { const j = (await res.json()) as { message?: string }; if (j?.message) msg = j.message; } catch {}
      return { ok: false, error: { code: 'AUTH', message: msg, status } };
    }

    const data = (await res.json()) as { idToken?: string; refreshToken?: string };
    if (!data.idToken) return { ok: false, error: { code: 'AUTH', message: 'Respuesta inválida: falta idToken' } };

    const jar = await cookies();
    jar.set('idToken', data.idToken, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
    if (data.refreshToken) {
      jar.set('refreshToken', data.refreshToken, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
    }
    // Guarda email para /auth/refresh
    jar.set('email', email, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });

    return { ok: true, next };
  } catch (err) {
    const status = (err as { status?: number })?.status;
    const message = (err as { message?: string })?.message ?? 'Error de red';
    return { ok: false, error: { code: 'NETWORK', message, status } };
  }
}
