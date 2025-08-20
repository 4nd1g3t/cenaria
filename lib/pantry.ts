// lib/pantry.ts

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  TransactWriteCommand,
  TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { normalizeName } from "./strings";
import type { Unit } from "./units";

/** ================== Config ================== */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://api.cenaria.app";
export const MAX_PANTRY_ITEMS = 50;

const TABLE = process.env.DDB_TABLE!;
const GSI1 = process.env.DDB_GSI1_NAME || "GSI1"; // por name_normalized

/** ================== Tipos ================== */
export interface PantryItem {
  id: string;
  name: string;
  name_normalized: string;
  quantity: number;
  unit: Unit;
  version: number;
  updatedAt: number;
  category?: string;
  perishable?: boolean;
  notes?: string;
}

export interface NewPantryItem {
  name: string;
  quantity: number;
  unit: Unit; // tipo estricto interno
  category?: string;
  perishable?: boolean;
  notes?: string;
}

/** Compat de entrada desde UI (puede venir unit:string) */
export type NewPantryItemInput = Omit<NewPantryItem, "unit"> & { unit: string };

export interface ListPantryResponse {
  items: PantryItem[];
  nextCursor?: string;
}

/** ================== Utilidades ================== */
function makeAppError(message: string, meta?: Record<string, unknown>) {
  const err = new Error(message) as Error & { meta?: Record<string, unknown> };
  if (meta) err.meta = meta;
  return err;
}

async function handleJSON<T>(res: Response): Promise<T> {
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw makeAppError(`${res.status} ${res.statusText}`.trim(), {
      status: res.status,
      body: text,
    });
  }
  try {
    return text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    throw makeAppError("invalid_json_response", { body: text });
  }
}

/** Normaliza unit:string → Unit (valida) */
const ALLOWED_UNITS: ReadonlyArray<Unit> = [
  "g",
  "kg",
  "ml",
  "l",
  "pieza",
  "taza",
  "cda",
  "cdta",
];

function toUnit(u: string): Unit {
  const v = u?.toLowerCase().trim();
  if (ALLOWED_UNITS.includes(v as Unit)) return v as Unit;
  throw makeAppError(`invalid_unit: ${u}`);
}

/** Entrada flexible para sanitizar (sin usar any) */
type NewPantryItemFlexible = {
  name: string;
  quantity: number;
  unit: Unit | string;
  category?: string;
  perishable?: boolean;
  notes?: string;
};

/** Acepta item con unit:string o Unit y devuelve tipado estricto */
function sanitizeNewItem<T extends NewPantryItemFlexible>(item: T): NewPantryItem {
  const unitStrict: Unit =
    typeof item.unit === "string" ? toUnit(item.unit) : item.unit;
  return {
    name: item.name,
    quantity: Number(item.quantity),
    unit: unitStrict,
    category: item.category,
    perishable: item.perishable,
    notes: item.notes,
  };
}

/** ================== Cliente HTTP (frontend → API) ================== */

/** GET /v1/pantry (listado; imponemos limit=50) */
export async function listPantry(params: {
  idToken: string;
  search?: string;
  category?: string;
  cursor?: string; // ignorado en UI actual
}): Promise<ListPantryResponse> {
  const url = new URL("/v1/pantry", API_BASE);
  url.searchParams.set("limit", String(MAX_PANTRY_ITEMS));
  if (params.search) url.searchParams.set("search", params.search);
  if (params.category) url.searchParams.set("category", params.category);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${params.idToken}` },
    cache: "no-store",
  });
  return handleJSON<ListPantryResponse>(res);
}

/** POST /v1/pantry (múltiples) — ahora acepta unit:string o Unit */
export async function createPantryItems(params: {
  idToken: string;
  items: Array<NewPantryItem | NewPantryItemInput>;
}): Promise<{ items: PantryItem[] }> {
  const strict = params.items.map(sanitizeNewItem);
  const res = await fetch(`${API_BASE}/v1/pantry`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.idToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ items: strict }),
  });
  return handleJSON<{ items: PantryItem[] }>(res);
}

/** ✅ Crear 1 ítem — acepta {item} o {input} desde actions.ts */
export async function createPantryItem(params: {
  idToken: string;
  item?: NewPantryItem | NewPantryItemInput;
  input?: NewPantryItem | NewPantryItemInput; // alias usado por actions.ts
}): Promise<PantryItem> {
  const item = params.item ?? params.input;
  if (!item) throw makeAppError("missing_item");
  const out = await createPantryItems({ idToken: params.idToken, items: [item] });
  const created = out.items?.[0];
  if (!created) throw makeAppError("create_failed");
  return created;
}

/** GET /v1/pantry/{id} */
export async function getPantryItem(params: {
  idToken: string;
  id: string;
}): Promise<PantryItem> {
  const res = await fetch(`${API_BASE}/v1/pantry/${params.id}`, {
    headers: { Authorization: `Bearer ${params.idToken}` },
    cache: "no-store",
  });
  return handleJSON<PantryItem>(res);
}

/** PUT /v1/pantry/{id} — acepta Unit | string en body.unit */
export async function putPantryItem(params: {
  idToken: string;
  id: string;
  body: {
    name: string;
    quantity: number;
    unit: Unit | string;
    category?: string;
    perishable?: boolean;
    notes?: string;
  };
  version?: number; // If-Match
}): Promise<PantryItem> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${params.idToken}`,
    "content-type": "application/json",
  };
  if (typeof params.version === "number") headers["If-Match"] = String(params.version);

  const strictUnit = toUnit(String(params.body.unit));
  const res = await fetch(`${API_BASE}/v1/pantry/${params.id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ ...params.body, unit: strictUnit }),
  });
  return handleJSON<PantryItem>(res);
}

/** PATCH /v1/pantry/{id} — acepta Unit | string en patch.unit */
export async function patchPantryItem(params: {
  idToken: string;
  id: string;
  patch: Partial<{
    name: string;
    quantity: number;
    unit: Unit | string;
    category?: string;
    perishable?: boolean;
    notes?: string;
  }>;
  version?: number; // If-Match
}): Promise<PantryItem> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${params.idToken}`,
    "content-type": "application/json",
  };
  if (typeof params.version === "number") headers["If-Match"] = String(params.version);

  const patchObj: Record<string, unknown> = { ...params.patch };
  if (patchObj.unit !== undefined) {
    patchObj.unit = toUnit(String(patchObj.unit));
  }
  const res = await fetch(`${API_BASE}/v1/pantry/${params.id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(patchObj),
  });
  return handleJSON<PantryItem>(res);
}

/** ✅ Compat: update genérico (lo que tu actions.ts importa como updatePantryItem) */
export async function updatePantryItem(params: {
  idToken: string;
  id: string;
  patch: Partial<{
    name: string;
    quantity: number;
    unit: Unit | string;
    category?: string;
    perishable?: boolean;
    notes?: string;
  }>;
  version?: number;
}): Promise<PantryItem> {
  return patchPantryItem(params);
}

/** DELETE /v1/pantry/{id} (OCC opcional) */
export async function deletePantryItem(params: {
  idToken: string;
  id: string;
  version?: number; // If-Match
}): Promise<void> {
  const headers: Record<string, string> = { Authorization: `Bearer ${params.idToken}` };
  if (typeof params.version === "number") headers["If-Match"] = String(params.version);

  const res = await fetch(`${API_BASE}/v1/pantry/${params.id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw makeAppError(`${res.status} ${res.statusText}`.trim(), {
      status: res.status,
      body: bodyText,
    });
  }
}

/** ================== Acceso directo DDB (backend/server-only) ================== */

const ddbDoc = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function findPantryByName(sub: string, rawName: string): Promise<PantryItem | null> {
  const nameNorm = normalizeName(rawName);
  const res = await ddbDoc.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: GSI1,
      KeyConditionExpression: "#gpk = :gpk AND #gsk = :gsk",
      ExpressionAttributeNames: { "#gpk": "GSI1PK", "#gsk": "GSI1SK" },
      ExpressionAttributeValues: { ":gpk": `USER#${sub}`, ":gsk": nameNorm },
      Limit: 1,
    })
  );
  if (!res.Items || res.Items.length === 0) return null;

  const it = res.Items[0] as unknown as {
    id: string;
    name: string;
    name_normalized: string;
    quantity: number;
    unit: Unit;
    version: number;
    updatedAt: number;
    category?: string;
    perishable?: boolean;
    notes?: string;
  };

  return {
    id: it.id,
    name: it.name,
    name_normalized: it.name_normalized,
    quantity: it.quantity,
    unit: it.unit,
    version: it.version,
    updatedAt: it.updatedAt,
    category: it.category,
    perishable: it.perishable,
    notes: it.notes,
  };
}

/** ================== Transacciones DDB para aplicar descuentos ================== */

export type PantryUpdate =
  | {
      action: "update";
      id: string;
      name: string;
      from: { quantity: number; unit: Unit };
      to: { quantity: number; unit: Unit };
      expectedVersion: number;
    }
  | {
      action: "delete";
      id: string;
      name: string;
      from: { quantity: number; unit: Unit };
      expectedVersion: number;
    };

export async function applyPantryUpdates(sub: string, updates: PantryUpdate[]) {
  if (updates.length === 0) return;
  const now = Date.now();
  const tx: TransactWriteCommandInput = {
    TransactItems: updates.map((u) => {
      if (u.action === "delete") {
        return {
          Delete: {
            TableName: TABLE,
            Key: { PK: `USER#${sub}`, SK: `PANTRY#${u.id}` },
            ConditionExpression: "#v = :v",
            ExpressionAttributeNames: { "#v": "version" },
            ExpressionAttributeValues: { ":v": u.expectedVersion },
          },
        };
      }
      return {
        Update: {
          TableName: TABLE,
          Key: { PK: `USER#${sub}`, SK: `PANTRY#${u.id}` },
          ConditionExpression: "#v = :v",
          UpdateExpression: "SET #q = :q, #u = :u, #ver = :ver",
          ExpressionAttributeNames: {
            "#q": "quantity",
            "#u": "updatedAt",
            "#ver": "version",
            "#v": "version",
          },
          ExpressionAttributeValues: {
            ":q": u.to.quantity,
            ":u": now,
            ":ver": u.expectedVersion + 1,
            ":v": u.expectedVersion,
          },
        },
      };
    }),
  };
  await ddbDoc.send(new TransactWriteCommand(tx));
}
