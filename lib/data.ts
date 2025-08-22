import type { NativeAttributeValue } from "@aws-sdk/lib-dynamodb";
import type { WeeklyMenu } from "@/app/menu/menu-model";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  type PutCommandInput,
} from "@aws-sdk/lib-dynamodb";
import type { PantryItem } from "./pantry";
import { TABLE } from "./constants";

/** **************
 *  Config DDB
 *  **************/
const TABLE_NAME = TABLE;
if (!TABLE_NAME) {
  throw new Error("Missing env TABLE_NAME for DynamoDB");
}

// Client nativo y DocumentClient (convierte JS <-> DDB automáticamente)
const ddb = new DynamoDBClient({});
const doc = DynamoDBDocumentClient.from(ddb, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
});

/** **************
 *  Helpers clave
 *  **************/
const pkUser = (sub: string) => `USER#${sub}`;
const skMenu = (id: string) => `MENU#${id}`;
const skPantryPrefix = "PANTRY#";

/** *****************************************************************
 *  MENÚ — Crear (Put con condición de "no existe") y Leer (Get)
 *  *****************************************************************/

export async function saveMenu(menu: WeeklyMenu): Promise<WeeklyMenu> {
  const input: PutCommandInput = {
    TableName: TABLE_NAME,
    Item: {
      PK: pkUser(menu.userSub),
      SK: skMenu(menu.id),
      entity: "WEEKLY_MENU",
      ...menu,
    },
    ConditionExpression:
      "attribute_not_exists(PK) AND attribute_not_exists(SK)",
  };
  await doc.send(new PutCommand(input));
  return menu;
}

export async function updateMenu(
  menu: WeeklyMenu,
  ifMatch?: number
): Promise<WeeklyMenu> {
  const input: PutCommandInput = {
    TableName: TABLE_NAME,
    Item: {
      PK: pkUser(menu.userSub),
      SK: skMenu(menu.id),
      entity: "WEEKLY_MENU",
      ...menu,
    },
    ConditionExpression:
      ifMatch != null
        ? "#v = :expectedVersion"
        : "attribute_exists(PK) AND attribute_exists(SK)",
    ExpressionAttributeNames: ifMatch != null ? { "#v": "version" } : undefined,
    ExpressionAttributeValues:
      ifMatch != null ? { ":expectedVersion": ifMatch } : undefined,
  };
  await doc.send(new PutCommand(input));
  return menu;
}

export async function getMenuById(
  userSub: string,
  id: string
): Promise<WeeklyMenu> {
  const r = await doc.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: pkUser(userSub), SK: skMenu(id) },
    })
  );
  if (!r.Item) throw new Error("Not found");
  return r.Item as WeeklyMenu;
}

/** *****************************************************************
 *  DESPENSA — Listado por usuario (Query por PK + begins_with)
 *  *****************************************************************/

type DDBKey = Record<string, NativeAttributeValue>;
type DDBItem = Record<string, NativeAttributeValue>;

function isPantryItem(x: DDBItem): x is PantryItem {
  const id = x["id"];
  const name = x["name"];
  const quantity = x["quantity"];
  const unit = x["unit"];
  return (
    typeof id === "string" &&
    typeof name === "string" &&
    typeof quantity === "number" &&
    typeof unit === "string"
  );
}

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

  const r = await doc.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": pkUser(userSub),
        ":prefix": skPantryPrefix,
      },
      Limit: Math.min(Math.max(opts?.limit ?? 200, 1), 1000),
      ExclusiveStartKey,
    })
  );

  const rawItems = (r.Items ?? []) as DDBItem[];
  const items = rawItems.filter(isPantryItem);
  const nextCursor = encodeCursor(r.LastEvaluatedKey as DDBKey | undefined);
  return { items, nextCursor };
}

/** *****************************************************************
 *  Utilidades de cursor (base64 del LastEvaluatedKey del DocumentClient)
 *  *****************************************************************/
export function encodeCursor(key?: DDBKey): string | undefined {
  if (!key) return undefined;
  // Nota: En nuestra tabla, PK/SK son string; JSON.stringify es seguro aquí.
  return Buffer.from(JSON.stringify(key), "utf8").toString("base64url");
}

export function decodeCursor(cursor?: string): DDBKey | undefined {
  if (!cursor) return undefined;
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    return JSON.parse(json) as DDBKey;
  } catch {
    return undefined;
  }
}
