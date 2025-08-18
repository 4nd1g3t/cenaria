'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export type AuthActionError = { code: string; message: string; status?: number };
export type AuthActionState = { ok: boolean; error?: AuthActionError };

type SignInResponse = {
  idToken?: string;
  refreshToken?: string;
  expiresIn?: number; // segundos (opcional, si tu API lo entrega)
  tokenType?: string; // ej. "Bearer"
  // ...cualquier otro campo que exponga tu backend
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.cenaria.app';

export async function signInAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const fullName = (formData.get('fullName') as string) || undefined; // opcional
  const next = (formData.get('next') as string) || '/despensa';

  if (!email || !password) {
    return { ok: false, error: { code: 'VALIDATION', message: 'Correo y contraseña son requeridos' } };
  }

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
      try {
        const j = (await res.json()) as { message?: string };
        if (j?.message) msg = j.message;
      } catch {
        // ignore
      }
      return { ok: false, error: { code: 'AUTH', message: msg, status } };
    }

    const data = (await res.json()) as SignInResponse;

    const idToken = data.idToken;
    if (!idToken) {
      return { ok: false, error: { code: 'AUTH', message: 'Respuesta inválida: falta idToken' } };
    }

    const jar = await cookies();
    // Cookie de sesión: httpOnly + secure
    jar.set('idToken', idToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      // maxAge: data.expiresIn ? Math.max(60, Math.min(3600 * 12, data.expiresIn - 60)) : undefined,
      // ^ puedes ajustar si tu backend devuelve expiresIn
    });

    if (data.refreshToken) {
      jar.set('refreshToken', data.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
      });
    }

    redirect(next);
  } catch (err) {
    const status = (err as { status?: number })?.status;
    const message = (err as { message?: string })?.message ?? 'Error de red';
    return { ok: false, error: { code: 'NETWORK', message, status } };
  }
}
