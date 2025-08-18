'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export type AuthActionError = { code: string; message: string; status?: number };
export type AuthActionState = { ok: boolean; error?: AuthActionError };

type SignUpBody = {
  email: string;
  password: string;
  fullName: string;
};

type SignInResponse = {
  idToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.cenaria.app';

export async function signUpAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const fullName = String(formData.get('fullName') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const confirmPassword = String(formData.get('confirmPassword') || '');
  const next = (formData.get('next') as string) || '/despensa';

  if (!fullName || fullName.length < 2) {
    return { ok: false, error: { code: 'VALIDATION', message: 'Nombre completo inválido' } };
  }
  if (!email || !password) {
    return { ok: false, error: { code: 'VALIDATION', message: 'Correo y contraseña son requeridos' } };
  }
  if (password !== confirmPassword) {
    return { ok: false, error: { code: 'VALIDATION', message: 'Las contraseñas no coinciden' } };
  }

  try {
    // 1) Signup
    const body: SignUpBody = { email, password, fullName };
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!res.ok) {
      const status = res.status;
      let msg = 'Error creando la cuenta';
      try {
        const j = (await res.json()) as { message?: string };
        if (j?.message) msg = j.message;
      } catch {
        // ignore
      }
      return { ok: false, error: { code: 'SIGNUP', message: msg, status } };
    }

    // 2) Auto-signin (si tu API lo admite con las mismas credenciales)
    const resSignIn = await fetch(`${API_URL}/auth/signin`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, fullName }),
      cache: 'no-store',
    });

    if (!resSignIn.ok) {
      // Si fallara el auto-login, redirige al /signin con next
      redirect(`/signin?next=${encodeURIComponent(next)}`);
    }

    const data = (await resSignIn.json()) as SignInResponse;
    const idToken = data.idToken;
    const refreshToken = data.refreshToken;

    if (!idToken) {
      // caso borde: si no viene idToken, manda a /signin
      redirect(`/signin?next=${encodeURIComponent(next)}`);
    }

    const jar = await cookies();
    jar.set('idToken', idToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
    if (refreshToken) {
      jar.set('refreshToken', refreshToken, {
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
