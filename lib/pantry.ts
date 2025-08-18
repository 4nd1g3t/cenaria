// src/lib/pantry.ts
export interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category?: string;
  perishable?: boolean;
  notes?: string;
  createdAt?: number; // epoch ms (opcional si el backend aún no los retorna)
  updatedAt?: number; // epoch ms
  /** Control de concurrencia (OCC) */
  version: number;
}

export interface ListPantryResponse {
  items: PantryItem[];
  nextCursor?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api.cenaria.app";

/** parsea JSON si existe; permite 204 sin cuerpo */
async function handleJSON<T>(res: Response): Promise<T> {
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} ${text || ""}`.trim());
  }
  return data as T;
}

/** LIST */
export async function listPantry(params: {
  idToken: string;
  limit?: number;
  cursor?: string;
  search?: string;
  category?: string;
}): Promise<ListPantryResponse> {
  const url = new URL("/v1/pantry", API_BASE);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  if (params.cursor) url.searchParams.set("cursor", params.cursor);
  if (params.search) url.searchParams.set("search", params.search);
  if (params.category) url.searchParams.set("category", params.category);

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${params.idToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  // Esperamos { items, nextCursor? }
  return handleJSON<ListPantryResponse>(res);
}

/** CREATE (bulk) — recomendado por la doc {items:[...]} */
export async function createPantryItems(params: {
  idToken: string;
  items: Array<
    Pick<PantryItem, "name" | "quantity" | "unit"> & {
      category?: string;
      perishable?: boolean;
      notes?: string;
    }
  >;
}): Promise<ListPantryResponse> {
  const res = await fetch(`${API_BASE}/v1/pantry`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.idToken}`,
      "content-type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ items: params.items }),
  });
  return handleJSON<ListPantryResponse>(res);
}

/** CREATE (single) — wrapper para no romper a los llamadores existentes */
export async function createPantryItem(params: {
  idToken: string;
  input: {
    name: string;
    quantity: number;
    unit: string;
    category?: string;
    perishable?: boolean;
    notes?: string;
  };
}): Promise<PantryItem> {
  const { items } = await createPantryItems({
    idToken: params.idToken,
    items: [params.input],
  });
  return items[0];
}

/** UPDATE (PATCH parcial) con OCC por versión */
export async function updatePantryItem(params: {
  idToken: string;
  id: string;
  version?: number; // If-Match: versión esperada (recomendado)
  patch: Partial<
    Pick<
      PantryItem,
      "name" | "quantity" | "unit" | "category" | "perishable" | "notes"
    >
  >;
}): Promise<PantryItem> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${params.idToken}`,
    "content-type": "application/json",
    Accept: "application/json",
  };
  if (typeof params.version === "number") {
    headers["If-Match"] = String(params.version);
  }

  const res = await fetch(`${API_BASE}/v1/pantry/${params.id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(params.patch),
  });
  return handleJSON<PantryItem>(res);
}

/** DELETE con OCC opcional por versión; espera 204 No Content */
export async function deletePantryItem(params: {
  idToken: string;
  id: string;
  version?: number;
}): Promise<void> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${params.idToken}`,
    Accept: "application/json",
  };
  if (typeof params.version === "number") {
    headers["If-Match"] = String(params.version);
  }

  const res = await fetch(`${API_BASE}/v1/pantry/${params.id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} ${body}`.trim());
  }
  // 204 OK → sin cuerpo
}
