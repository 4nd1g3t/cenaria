import type { AttributeValue } from "@aws-sdk/client-dynamodb";
import type { WeeklyMenu } from "@/app/menu/menu-model";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  type PutCommandInput,
} from "@aws-sdk/lib-dynamodb";

/** **************
 *  Config DDB
 *  **************/
const TABLE_NAME = process.env.TABLE_NAME;
if (!TABLE_NAME) {
  throw new Error("Missing env TABLE_NAME for DynamoDB");
}

// Client nativo y DocumentClient (convierte JS <-> DDB automáticamente)
const ddb = new DynamoDBClient({});
const doc = DynamoDBDocumentClient.from(ddb, {
  marshallOptions: {
    removeUndefinedValues: true, // evita escribir atributos undefined
    convertClassInstanceToMap: true,
  },
});

/** **************
 *  Tipos
 *  **************/
export type PantryItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;         // "g" | "kg" | "ml" | "l" | "pieza" | ...
  category?: string;
  perishable?: boolean;
  notes?: string;
  createdAt?: number;
  updatedAt?: number;
  version?: number;
};

/** **************
 *  Helpers
 *  **************/
const pkUser = (sub: string) => `USER#${sub}`;
const skMenu = (id: string) => `MENU#${id}`;
const skPantryPrefix = "PANTRY#";

/** *****************************************************************
 *  MENÚ — Crear (Put con condición de "no existe") y Leer (Get)
 *  *****************************************************************/

/**
 * Crea un menú nuevo. Falla si ya existe (OCC por no-existencia).
 */
export async function saveMenu(menu: WeeklyMenu): Promise<WeeklyMenu> {
  const input: PutCommandInput = {
    TableName: TABLE_NAME!,
    Item: {
      PK: pkUser(menu.userSub),
      SK: skMenu(menu.id),
      entity: "WEEKLY_MENU",
      ...menu,
    },
    ConditionExpression:
      "attribute_not_exists(PK) AND attribute_not_exists(SK)", // evita sobrescribir
  };

  await doc.send(new PutCommand(input));
  return menu;
}

/**
 * Actualiza un menú completo (replace semantics) con OCC por versión.
 * - Si `ifMatch` se pasa, exige que la `version` almacenada sea igual a `ifMatch`.
 * - Si no se pasa, exige al menos que el ítem exista.
 *
 * Sugerencia: antes de llamar, incrementa `menu.version` en memoria.
 */
export async function updateMenu(
  menu: WeeklyMenu,
  ifMatch?: number
): Promise<WeeklyMenu> {
  // Estrategia simple: PUT con condición sobre versión o existencia
  const input: PutCommandInput = {
    TableName: TABLE_NAME!,
    Item: {
      PK: pkUser(menu.userSub),
      SK: skMenu(menu.id),
      entity: "WEEKLY_MENU",
      ...menu,
    },
    ConditionExpression: ifMatch != null
      ? "#v = :expectedVersion"
      : "attribute_exists(PK) AND attribute_exists(SK)",
    ExpressionAttributeNames: ifMatch != null ? { "#v": "version" } : undefined,
    ExpressionAttributeValues: ifMatch != null ? { ":expectedVersion": ifMatch } : undefined,
  };

  await doc.send(new PutCommand(input));
  return menu;
}

/**
 * Lee un menú por id para un usuario.
 * Lanza error si no existe (útil para simplificar handlers).
 */
export async function getMenuById(userSub: string, id: string): Promise<WeeklyMenu> {
  const r = await doc.send(
    new GetCommand({
      TableName: TABLE_NAME!,
      Key: { PK: pkUser(userSub), SK: skMenu(id) },
    })
  );
  if (!r.Item) throw new Error("Not found");
  // El item ya está “des-marshalled” por DocumentClient
  return r.Item as WeeklyMenu;
}

/** *****************************************************************
 *  DESPENSA — Listado por usuario (Query por PK + begins_with)
 *  *****************************************************************/

/**
 * Lista ítems de despensa del usuario. Paginación opcional.
 * - Usa Query sobre PK=USER#sub y begins_with(SK, 'PANTRY#').
 * - Devuelve hasta `limit` registros y `nextCursor` si hay más.
 */
export async function listPantryForUser(
  userSub: string,
  opts?: { limit?: number; cursor?: string }
): Promise<{ items: PantryItem[]; nextCursor?: string }> {
  const ExclusiveStartKey = decodeCursor(opts?.cursor);

  const r = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME!,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": { S: pkUser(userSub) },
        ":prefix": { S: skPantryPrefix },
      },
      Limit: Math.min(Math.max(opts?.limit ?? 200, 1), 1000),
      ExclusiveStartKey,
    })
  );

  const items = (r.Items ?? []).map(unmarshallDoc) as PantryItem[];
  const nextCursor = encodeCursor(r.LastEvaluatedKey);
  return { items, nextCursor };
}

/** *****************************************************************
 *  Utilidades de cursor (base64 del LastEvaluatedKey nativo)
 *  *****************************************************************/
export function encodeCursor(
  key?: Record<string, AttributeValue>
): string | undefined {
  if (!key) return undefined;
  return Buffer.from(JSON.stringify(key), "utf8").toString("base64url");
}

export function decodeCursor(
  cursor?: string
): Record<string, AttributeValue> | undefined {
  if (!cursor) return undefined;
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    // Confía en la forma de DynamoDB: PK/SK con valores AttributeValue
    return JSON.parse(json) as Record<string, AttributeValue>;
  } catch {
    return undefined;
  }
}

function fromAttr(av: AttributeValue): unknown {
  if ("S" in av && av.S !== undefined) return av.S;
  if ("N" in av && av.N !== undefined) return Number(av.N);
  if ("BOOL" in av && av.BOOL !== undefined) return av.BOOL;
  if ("NULL" in av && av.NULL !== undefined) return null;

  if ("M" in av && av.M !== undefined) {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(av.M)) {
      obj[k] = fromAttr(v as AttributeValue);
    }
    return obj;
  }

  if ("L" in av && av.L !== undefined) {
    return av.L.map((elem) => fromAttr(elem as AttributeValue));
  }

  // Soporte opcional por si usas tipos binarios o sets en el futuro:
  if ("B" in av && av.B !== undefined) return av.B;        // Uint8Array
  if ("SS" in av && av.SS !== undefined) return [...av.SS];
  if ("NS" in av && av.NS !== undefined) return av.NS.map((n) => Number(n));
  if ("BS" in av && av.BS !== undefined) return [...av.BS];

  // Si llega un caso no contemplado, devuelve undefined para no romper tipos.
  return undefined;
}

/**
 * Convierte un "documento" (mapa de AttributeValue) a un objeto JS plano.
 */
function unmarshallDoc(avMap: Record<string, AttributeValue>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(avMap)) {
    out[k] = fromAttr(v);
  }
  return out;
}