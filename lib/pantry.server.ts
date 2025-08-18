import "server-only";
import { PantryClient } from "./_pantry";
import { cookies } from "next/headers";

/**
 * Factory de PantryClient para uso en el servidor.
 * Lee el ID Token desde cookies httpOnly.
 */
export function getServerPantry() {
  return new PantryClient({
    getIdToken: async () => {
      // 👇 cookies() es async en tu setup
      const c = await cookies();
      const token =
        c.get("cenaria.idToken")?.value ??
        c.get("idToken")?.value ??
        undefined;

      if (!token) {
        throw new Error("No hay idToken en cookies del servidor");
      }
      return token;
    },
  });
}
