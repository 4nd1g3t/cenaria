// src/lib/auth.ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Hacerlo async porque cookies() devuelve una promesa en tu entorno
export async function getIdTokenOrRedirect() {
  const jar = await cookies();               // ✅ await aquí
  const id = jar.get("idToken")?.value;      // ajusta el nombre si usas otro
  if (!id) redirect("/signin");
  return id;
}

export function authHeaders(idToken: string): HeadersInit {
  return { Authorization: `Bearer ${idToken}`, "content-type": "application/json" };
}
