// middleware.js
import { NextResponse } from 'next/server'

const TOKEN_COOKIE_CANDIDATES = ['idToken']

function hasIdTokenCookie(req) {
  return TOKEN_COOKIE_CANDIDATES.some((name) => !!req.cookies.get(name)?.value)
}

export function middleware(req) {
  const { pathname, search } = req.nextUrl

  // Aquí solo llega si coincide con el matcher (despensa/menu)
  if (hasIdTokenCookie(req)) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = '/signin'
  url.searchParams.set('next', pathname + (search || ''))
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/pantry/:path*', '/menu/:path*'],
}
