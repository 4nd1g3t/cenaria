import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { APP_URL, API_URL } from '@/lib/constants';

export async function GET() {
  const jar = await cookies();
  const refreshToken = jar.get('refreshToken')?.value || null;
  const email = jar.get('email')?.value || null;

  // Intenta revocar refreshToken (si tu backend soporta este endpoint)
  if (refreshToken && email) {
    try {
      await fetch(`${API_URL}/auth/revoke`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, refreshToken }),
        cache: 'no-store',
      });
    } catch {
      // ignorar errores de red al revocar
    }
  }

  // Limpia cookies
  //TODO: Cambier secure a true
  ['idToken', 'id_token', 'cenaria.idToken', 'refreshToken', 'email', 'userEmail'].forEach((name) => {
    jar.set(name, '', { httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: 0 });
  });

  const url = new URL('/signin', APP_URL);
  return NextResponse.redirect(url);
}
