// lib/pantry.ts
import { API_URL, MAX_PANTRY_ITEMS, GSI1, TABLE } from "./constants";
import { UNITS } from "./units";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  TransactWriteCommand,
  TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { normalizeName } from "@/lib/strings";
//import type { Unit } from "./units";
import { redirect } from "next/navigation";



export type Unit = "g"|"kg"|"ml"|"l"|"pieza"|"taza"|"cda"|"cdta";
export type Category =
  "verduras"|"frutas"|"carnes"|"lácteos"|"granos"|"especias"|"enlatados"|"otros";

export interface PantryItem {
  id: string;
  name: string;
  //name_normalized?: string;
  quantity: number;
  unit: Unit;
  category?: Category;
  perishable?: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  version: number;
}

export interface NewPantryItem {
  name: string;
  //name_normalized: string;
  quantity: number;
  unit: Unit;
  category?: Category;
  perishable?: boolean;
  notes?: string;
}


/** ================== Tipos ================== 
export interface PantryItem {
  id: string;
  name: string;
  name_normalized: string;
  quantity: number;
  unit: Unit | string;
  version: number;
  category?: string;
  perishable?: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface NewPantryItem {
  name: string;
  name_normalized?: string;
  quantity: number;
  unit: Unit | string;
  category?: string;
  perishable?: boolean;
  notes?: string;
}*/

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

function toUnit(u: string): Unit {
  const v = u?.toLowerCase().trim();
  if (UNITS.includes(v as Unit)) return v as Unit;
  throw makeAppError(`invalid_unit: ${u}`);
}

/** ================== Cliente HTTP (frontend → API) ================== */

/** GET /v1/pantry (listado; imponemos limit=50) */
export async function listPantry(params: {
  idToken: string;
  search?: string;
  category?: string;
  cursor?: string; // ignorado en UI actual
}): Promise<ListPantryResponse> {
  const url = new URL("/v1/pantry", API_URL);
  url.searchParams.set("limit", String(MAX_PANTRY_ITEMS));
  if (params.search) url.searchParams.set("search", params.search);
  if (params.category) url.searchParams.set("category", params.category);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${params.idToken}` },
    cache: "no-store",
  });
    if (!res.ok) {
    redirect("/signout");
  }
  return handleJSON<ListPantryResponse>(res);
}

/** POST /v1/pantry (múltiples) — ahora acepta unit:string o Unit */
export async function createPantryItems(params: {
  idToken: string;
  items: Array<PantryItem | NewPantryItem>;
}): Promise<{ items: PantryItem[] }> {
  const res = await fetch(`${API_URL}/v1/pantry`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.idToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ items: params.items }),
  });

  return handleJSON<{ items: PantryItem[] }>(res);
}

/** ✅ Crear 1 ítem — acepta {item} o {input} desde actions.ts */
export async function createPantryItem(params: {
  idToken: string;
  input: NewPantryItem;
}): Promise<PantryItem> {
  const item = params.input;
  if (!item) throw makeAppError("missing_item");
  item.unit  = typeof item.unit === "string" ? toUnit(item.unit) : item.unit;
  //item.name_normalized = normalizeName(item.name);
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
  const res = await fetch(`${API_URL}/v1/pantry/${params.id}`, {
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
  const res = await fetch(`${API_URL}/v1/pantry/${params.id}`, {
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
  const res = await fetch(`${API_URL}/v1/pantry/${params.id}`, {
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

  const res = await fetch(`${API_URL}/v1/pantry/${params.id}`, {
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
    updatedAt: string;
    category?: Category;
    perishable?: boolean;
    notes?: string;
  };

  return {
    id: it.id,
    name: it.name,
    //name_normalized: it.name_normalized,
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
