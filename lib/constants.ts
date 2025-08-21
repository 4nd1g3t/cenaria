// lib/constants.ts
export const MAX_PANTRY_ITEMS = 50;
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.cenaria.app';
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.cenaria.app';

export const TABLE = process.env.DDB_TABLE!;
export const GSI1 = process.env.DDB_GSI1_NAME || "GSI1"; // por name_normalized


export type AuthActionError = { code: string; message: string; status?: number };
export type AuthActionState = { ok: boolean; next?: string; error?: AuthActionError };
export type ApiStatusError = { status?: number; response?: { status?: number }; message?: string };

