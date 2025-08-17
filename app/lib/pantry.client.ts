"use client";
import { PantryClient } from "./pantry";

declare global {
  interface Window {
    __CENARIA_ID_TOKEN__?: string;
  }
}

export const pantryClientBrowser = new PantryClient({
  getIdToken: async () => {
    const token = window.__CENARIA_ID_TOKEN__;
    if (!token) throw new Error("ID Token no disponible en el navegador");
    return token;
  },
});
