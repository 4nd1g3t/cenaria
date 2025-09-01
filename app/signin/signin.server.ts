'use server'
import { COOKIE_SETTINGS } from '@/lib/config/constants'
import { API_URL } from '@/lib/config/constants'
import { AuthActionState } from '@/lib/types'
import { cookies } from 'next/headers'

export async function signInAction(
  prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  try {
    const email = String(formData.get('email') || '')
    const password = String(formData.get('password') || '')
    const next = (formData.get('next') as string) || '/pantry';
    const r = await fetch(`${API_URL}/auth/signin`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    })
    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      const msg = r.status === 401 ? 'Credenciales inválidas' : 'No se pudo iniciar sesión'
      return { ok: false, error: { code: 'AUTH', message: msg, status: r.status } }
    }
    
    const data = (await r.json()) as { idToken?: string; refreshToken?: string };
    if (!data.idToken) return { ok: false, error: { code: 'AUTH', message: 'Respuesta inválida: falta idToken' } };

    const jar = await cookies();
    jar.set('idToken', data.idToken, COOKIE_SETTINGS);
    if (data.refreshToken) {
      jar.set('refreshToken', data.refreshToken, COOKIE_SETTINGS);
    }
    jar.set('email', email, COOKIE_SETTINGS);

    return { ok: true, next: next || "/pantry"}
  } catch (err) {
    const status = (err as { status?: number })?.status;
    const message = (err as { message?: string })?.message ?? 'Error de red';
    return { ok: false, error: { code: 'NETWORK', message, status } };
  }
}
