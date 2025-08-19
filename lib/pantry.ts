// src/lib/pantry.ts

/** ================== Tipos ================== */
export interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category?: string;
  perishable?: boolean;
  notes?: string;
  createdAt?: number; // epoch ms
  updatedAt?: number; // epoch ms
  /** Control de concurrencia (OCC) */
  version: number;
}

export interface ListPantryResponse {
  items: PantryItem[];
  nextCursor?: string;
}

/** Error tipado que propagamos desde la capa fetch */
export interface AppError extends Error {
  code?: string;
  status?: number;
  body?: unknown;
  details?: unknown;
}

/** Tope duro de ítems permitido por usuario (enforced desde frontend) */
export const MAX_PANTRY_ITEMS = 50;

/** ================== Config ================== */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api.cenaria.app";

/** ================== Helpers ================== */
function makeAppError(message: string, init?: Partial<AppError>): AppError {
  const err = new Error(message) as AppError;
  if (init) {
    if (init.code) err.code = init.code;
    if (typeof init.status === "number") err.status = init.status;
    if ("body" in init) err.body = init.body;
    if ("details" in init) err.details = init.details;
  }
  return err;
}

function safeParseJSON(txt: string): unknown | null {
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

function readStringField(obj: unknown, field: string): string | undefined {
  if (obj && typeof obj === "object" && obj !== null) {
    const v = (obj as Record<string, unknown>)[field];
    return typeof v === "string" ? v : undefined;
  }
  return undefined;
}

function readUnknown(obj: unknown, field: string): unknown {
  if (obj && typeof obj === "object" && obj !== null) {
    return (obj as Record<string, unknown>)[field];
  }
  return undefined;
}

/** parsea JSON si existe; permite 204 sin cuerpo y conserva detalles de error */
async function handleJSON<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? safeParseJSON(text) : null;

  if (!res.ok) {
    const code =
      readStringField(data, "code") ??
      readStringField(data, "error") ??
      readStringField(data, "name");
    const message =
      readStringField(data, "message") ??
      readStringField(data, "error_description") ??
      `${res.status} ${res.statusText}`;

    const err = makeAppError(message, {
      code,
      status: res.status,
      body: data ?? text,
    });
    throw err;
  }
  return (data as T) ?? ({} as T);
}

/** Obtiene el conteo actual (hasta 50) del usuario */
async function getPantryCount(params: {
  idToken: string;
  search?: string;
  category?: string;
}): Promise<number> {
  const { items } = await listPantry({
    idToken: params.idToken,
    search: params.search,
    category: params.category,
  });
  return items.length;
}

/** Lanza error si current + requested > MAX_PANTRY_ITEMS */
function assertCapacityOrThrow(current: number, requested: number): void {
  if (current + requested > MAX_PANTRY_ITEMS) {
    throw makeAppError(
      `Se permite un máximo de ${MAX_PANTRY_ITEMS} ingredientes en la despensa.`,
      {
        code: "PANTRY_LIMIT_EXCEEDED",
        details: { current, requested, max: MAX_PANTRY_ITEMS },
      }
    );
  }
}

/** ================== API: LIST ================== */
/** LIST (máx 50) */
export async function listPantry(params: {
  idToken: string;
  search?: string;
  category?: string;
  /** ignorado: no paginamos en frontend */
  cursor?: string;
}): Promise<ListPantryResponse> {
  const url = new URL("/v1/pantry", API_BASE);

  // Siempre imponemos limit=50
  url.searchParams.set("limit", String(MAX_PANTRY_ITEMS));
  // ignoramos cursor en el frontend (sin paginación)
  if (params.search) url.searchParams.set("search", params.search);
  if (params.category) url.searchParams.set("category", params.category);

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${params.idToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  return handleJSON<ListPantryResponse>(res);
}

/** ================== API: CREATE ================== */
/**
 * CREATE (bulk)
 * Enforce de límite:
 *  - Si pasas currentCount, se usa para validar sin red extra.
 *  - Si NO pasas currentCount, hace un GET para calcularlo y valida.
 */
export async function createPantryItems(params: {
  idToken: string;
  items: Array<
    Pick<PantryItem, "name" | "quantity" | "unit"> & {
      category?: string;
      perishable?: boolean;
      notes?: string;
    }
  >;
  /** Opcional: si lo proporcionas evitamos un GET previo para contar */
  currentCount?: number;
}): Promise<ListPantryResponse> {
  const requested = params.items.length;
  if (requested <= 0) {
    return { items: [] };
  }

  // 1) Validación de capacidad (con currentCount si viene; si no, consultamos)
  const current =
    typeof params.currentCount === "number"
      ? params.currentCount
      : await getPantryCount({ idToken: params.idToken });

  assertCapacityOrThrow(current, requested);

  // 2) POST real
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

/** CREATE (single) — wrapper */
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
  /** Opcional: conteo actual para evitar GET previo de conteo */
  currentCount?: number;
}): Promise<PantryItem> {
  const { items } = await createPantryItems({
    idToken: params.idToken,
    items: [params.input],
    currentCount: params.currentCount,
  });
  return items[0];
}

/** ================== API: UPDATE / DELETE ================== */
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
    const bodyText = await res.text().catch(() => "");
    const err = makeAppError(`${res.status} ${res.statusText}`.trim(), {
      status: res.status,
      body: bodyText,
    });
    throw err;
  }
  // 204 OK → sin cuerpo
}
