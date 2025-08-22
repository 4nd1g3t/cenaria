// lib/pantry-db.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  TransactWriteCommand,
  TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { normalizeName } from "./strings";
import type { Unit } from "./units";
import type { PantryItem } from "./pantry";

const TABLE = process.env.DDB_TABLE!;
const GSI1  = process.env.DDB_GSI1_NAME || "GSI1"; // name_normalized

const ddbDoc = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/*export interface PantryItem {
  id: string;
  name: string;
  name_normalized: string;
  quantity: number;
  unit: Unit;
  version: number;
  updatedAt: number;
}*/

export type PantryUpdate =
  | { action: "update"; id: string; name: string; from: { quantity: number; unit: Unit }; to: { quantity: number; unit: Unit }; expectedVersion: number }
  | { action: "delete"; id: string; name: string; from: { quantity: number; unit: Unit }; expectedVersion: number };

export async function findPantryByName(sub: string, rawName: string): Promise<PantryItem | null> {
  const nameNorm = normalizeName(rawName);
  const out = await ddbDoc.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: GSI1,
      KeyConditionExpression: "#gpk = :gpk AND #gsk = :gsk",
      ExpressionAttributeNames: { "#gpk": "GSI1PK", "#gsk": "GSI1SK" },
      ExpressionAttributeValues: { ":gpk": `USER#${sub}`, ":gsk": nameNorm },
      Limit: 1,
    })
  );
  const it = out.Items?.[0];
  if (!it) return null;
  return {
    id: it.id as string,
    name: it.name as string,
    name_normalized: it.name_normalized as string,
    quantity: it.quantity as number,
    unit: it.unit as Unit,
    version: it.version as number,
    updatedAt: it.updatedAt as string,
  };
}

export async function applyPantryUpdates(sub: string, updates: PantryUpdate[]) {
  if (!updates.length) return;
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
          ExpressionAttributeNames: { "#q": "quantity", "#u": "updatedAt", "#ver": "version", "#v": "version" },
          ExpressionAttributeValues: { ":q": u.to.quantity, ":u": now, ":ver": u.expectedVersion + 1, ":v": u.expectedVersion },
        },
      };
    }),
  };
  await ddbDoc.send(new TransactWriteCommand(tx));
}
