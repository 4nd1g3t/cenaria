"use client";
import { PantryClient } from "./pantry";

/**
 * Singleton listo para usar en componentes cliente.
 * Ajusta la función getIdToken según tu integración de auth.
 */
export const pantryClientBrowser = new PantryClient({
  getIdToken: async () => {
    // Ejemplo con Amplify:
    // return (await (await Auth.currentSession()).getIdToken()).getJwtToken();

    // Ejemplo con variable global (debug):
    const token = (window as any).__CENARIA_ID_TOKEN__;
    if (!token) throw new Error("ID Token no disponible en el navegador");
    return token;
  },
});
