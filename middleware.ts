import { NextRequest, NextResponse } from 'next/server';

/**
 * Requiere cookie con el ID Token para acceder a /despensa.
 * Si falta, redirige a /signin?next=<ruta-original>
 *
 * Nota: ajusta los nombres de cookie si usas uno distinto.
 */
const TOKEN_COOKIE_CANDIDATES = ['idToken', 'id_token', 'cenaria.idToken'];

function hasIdTokenCookie(req: NextRequest): boolean {
  return TOKEN_COOKIE_CANDIDATES.some((name) => !!req.cookies.get(name)?.value);
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Solo proteger /despensa y subrutas
  const isProtected = pathname === '/despensa' || pathname.startsWith('/despensa/');
  if (!isProtected) return NextResponse.next();

  if (hasIdTokenCookie(req)) {
    return NextResponse.next();
  }

  // Redirigir a /signin manteniendo la ruta original en ?next=
  const url = req.nextUrl.clone();
  url.pathname = '/signin';
  const nextParam = pathname + (search || '');
  url.searchParams.set('next', nextParam);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/despensa/:path*'],
};
