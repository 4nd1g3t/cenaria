import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.cenaria.app';

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
  ['idToken', 'id_token', 'cenaria.idToken', 'refreshToken', 'email', 'userEmail'].forEach((name) => {
    jar.set(name, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });
  });

  const url = new URL('/signin', process.env.NEXT_PUBLIC_APP_URL || 'https://app.cenaria.app');
  return NextResponse.redirect(url);
}
