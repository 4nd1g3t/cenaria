import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const id = req.cookies.get("idToken")?.value;
  if (!id && req.nextUrl.pathname.startsWith("/despensa")) {
    const url = new URL("/signin", req.url);
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = { matcher: ["/despensa"] };
