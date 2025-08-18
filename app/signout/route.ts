import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const jar = await cookies();
  // limpia cookies conocidas
  ['idToken', 'id_token', 'cenaria.idToken', 'refreshToken'].forEach((name) => {
    jar.set(name, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });
  });

  const url = new URL('/signin', process.env.NEXT_PUBLIC_APP_URL || 'https://app.cenaria.app');
  return NextResponse.redirect(url);
}
