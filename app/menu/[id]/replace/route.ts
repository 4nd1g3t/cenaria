// app/api/menu/[id]/replace/route.ts
import { NextRequest, NextResponse } from "next/server";
import { replaceRecipe } from "@/lib/menu";
import { getIdTokenOrRedirect } from "@/lib/auth/session";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await getIdTokenOrRedirect("/menu");
  const body = await req.json();
  try {
    const data = await replaceRecipe(params.id, body);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Error" }, { status: 400 });
  }
}
