import { NextResponse } from "next/server";
import { PantryClient } from "@/lib/pantry";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.cenaria.app";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const cookie = req.headers.get("cookie") ?? "";
    const fromCookie = /(?:^|;\s*)idToken=([^;]+)/.exec(cookie)?.[1]
                    ?? /(?:^|;\s*)cenaria\.idToken=([^;]+)/.exec(cookie)?.[1];
    const auth = req.headers.get("authorization");
    const fromHeader = auth?.toLowerCase().startsWith("bearer ")
      ? auth.slice(7)
      : undefined;

    const idToken = fromCookie ?? fromHeader;
    if (!idToken) {
      return NextResponse.json(
        { error: "Falta ID Token (cookie idToken=... o header Authorization: Bearer ...)" },
        { status: 400 }
      );
    }

    const client = new PantryClient({ baseURL: BASE_URL, getIdToken: async () => idToken });
    const res = await client.list({ limit: 5 });
    return NextResponse.json({ ok: true, baseURL: BASE_URL, ...res.data }, { status: 200 });
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status ?? 500;
    const payload = (err as { payload?: unknown })?.payload ?? null;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message, status, details: payload }, { status });
  }
}
