// lib/menu.ts
import { API_URL } from "@/lib/config/constants";
import { getIdTokenOrRedirect } from "./auth/session";
import { Day } from "./types";

async function api<T>(path: string, opts: RequestInit = {}) {
  const idToken = getIdTokenOrRedirect("/menu");
  const r = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${idToken}`,
      ...(opts.headers || {}),
    },
    cache: "no-store",
  });

  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err?.message || r.statusText);
  }
  return (await r.json()) as T;
}

// --- Tipos ---
export type RecipeIngredient = { name: string; quantity: number; unit: string; notes?: string };
export type RecipeItem = {
  id: string; title: string; servings: number; durationMin: number;
  calories?: number; imageUrl?: string; steps: string[]; ingredients: RecipeIngredient[];
};
export type WeeklyMenu = {
  id: string;
  weekStart: string;
  persons: number;
  scope: "full_week"|"weekdays"|"custom";
  days: Partial<Record<Day, RecipeItem>>;
  status: "draft"|"final";
  version: number;
  prepared?: Array<{ at: number; scope: "all"|"weekdays"|"days"; days?: Day[]; dryRun: boolean }>;
};

// --- Endpoints directos a API Gateway ---
export async function generateMenu(body: {
  persons?: number;
  daysMode?: "full_week"|"weekdays";
  days?: Day[];
  constraints?: { maxDurationMin?: number; avoidCategories?: string[]; avoidIngredients?: string[]; dietary?: string[] };
  usePantry?: boolean;
}) {
  return api<{ menu: WeeklyMenu }>(`/v1/menu`, { method: "POST", body: JSON.stringify(body) });
}

export async function getMenu(id: string) {
  return api<WeeklyMenu>(`/v1/menu/${id}`, { method: "GET" });
}

export async function replaceRecipe(id: string, body: {
  day: Day;
  persons?: number;
  constraints?: { maxDurationMin?: number; avoidCategories?: string[]; avoidIngredients?: string[]; dietary?: string[] };
  usePantry?: boolean;
}) {
  return api<{ menu: WeeklyMenu }>(`/v1/menu/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export async function finalizeMenu(id: string, ifMatch?: string | number) {
  return api<{ id: string; status: "final"; version: number }>(`/v1/menu/${id}/finalize`, {
    method: "POST",
    headers: ifMatch ? { "If-Match": String(ifMatch) } : {},
  });
}

export type PrepareResponse = {
  prepared: boolean;
  scope: "all"|"weekdays"|"days";
  days?: Day[];
  shortages: Array<{
    name: string;
    required: { quantity: number; unit: string };
    available?: { quantity: number; unit: string };
    missing: { quantity: number; unit: string };
    reason: "unit_mismatch"|"not_found"|"insufficient";
  }>;
  pantryUpdates: Array<{
    id: string; name: string;
    from: { quantity: number; unit: string };
    to: { quantity: number; unit: string };
    action: "update"|"delete";
  }>;
  menu: WeeklyMenu;
};

export async function prepareMenu(id: string, body: {
  scope?: "all"|"weekdays"|"days";
  days?: Day[];
  dryRun?: boolean;
}) {
  return api<PrepareResponse>(`/v1/menu/${id}/prepare`, { method: "POST", body: JSON.stringify(body) });
}
