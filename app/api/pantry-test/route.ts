import { NextResponse } from "next/server";
import { getServerPantry } from "@/app/lib/pantry.server";

export const runtime = "nodejs"; // opcional

export async function GET(req: Request) {
  try {
    const client = getServerPantry();
    const res = await client.list({ limit: 5 });
    return NextResponse.json(res.data, { status: 200 });
  } catch (err: any) {
    console.error("pantry-test error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: err?.status ?? 500 }
    );
  }
}
