import { NextResponse } from "next/server";
import { PantryClient } from "@/app/lib/pantry";

// Usa prod si no hay env; cambia si quieres probar el stage dev directo
const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.cenaria.app"; // <- prod domain

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    // 1) Intenta tomar ID Token de cookie
    const cookie = req.headers.get("cookie") ?? "";
    const fromCookie = /(?:^|;\s*)idToken=([^;]+)/.exec(cookie)?.[1]
                    ?? /(?:^|;\s*)cenaria\.idToken=([^;]+)/.exec(cookie)?.[1];

    // 2) Fallback temporal: Authorization: Bearer <ID_TOKEN>
    const auth = req.headers.get("authorization");
    const fromHeader = auth?.toLowerCase().startsWith("bearer ")
      ? auth.slice(7)
      : undefined;

    const idToken = fromCookie ?? fromHeader;
    if (!idToken) {
      return NextResponse.json(
        { error: "Falta ID Token: envíalo en cookie idToken=... o header Authorization: Bearer <TOKEN>" },
        { status: 400 }
      );
    }

    // Cliente efímero con el token detectado
    const client = new PantryClient({
      baseURL: BASE_URL,
      getIdToken: async () => idToken!,
    });

    const res = await client.list({ limit: 5 });
    return NextResponse.json(
      { ok: true, baseURL: BASE_URL, ...res.data },
      { status: 200 }
    );
  } catch (err: any) {
    // Si el backend respondió algo no-JSON, devolvemos el texto para que lo veas
    const status = err?.status ?? 500;
    return NextResponse.json(
      { error: err?.message ?? "Unknown error", status, details: err?.payload ?? null },
      { status }
    );
  }
}
