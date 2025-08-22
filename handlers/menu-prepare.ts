// handlers/menu-prepare.ts
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { normalizeName } from "../lib/strings";
import { findPantryByName, applyPantryUpdates, type PantryUpdate } from "../lib/pantry-db";
import { isConvertible, toBase, fromBase, type Unit, type Day } from "../lib/units";
import { TABLE } from "../lib/constants";

const ddbDoc = DynamoDBDocumentClient.from(new DynamoDBClient({}));

interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: Unit;
  notes?: string;
}
interface RecipeItem {
  id: string;
  title: string;
  servings: number;
  durationMin: number;
  steps: string[];
  ingredients: RecipeIngredient[];
}
interface WeeklyMenu {
  id: string;
  userSub: string;
  weekStart: string;
  persons: number;
  scope: "full_week" | "weekdays" | "custom";
  days: Partial<Record<Day, RecipeItem>>;
  createdAt: number;
  updatedAt: number;
  version: number;
  status: "draft" | "final";
  prepared?: Array<{ at: number; scope: "all" | "weekdays" | "days"; days?: Day[]; dryRun: boolean }>;
}

interface PrepareMenuRequest {
  scope?: "all" | "weekdays" | "days";
  days?: Day[];
  dryRun?: boolean;
}

function json(statusCode: number, body: unknown) {
  return { statusCode, body: JSON.stringify(body), headers: { "content-type": "application/json" } };
}
function getUserSubFromAuth(auth: any): string {
  const claims = auth?.jwt?.claims ?? auth?.claims;
  const sub = claims?.sub ?? claims?.["cognito:username"];
  if (!sub) throw new Error("Missing sub");
  return String(sub);
}
function pkUser(sub: string) { return `USER#${sub}`; }
function skMenu(id: string) { return `MENU#${id}`; }

async function getMenuById(sub: string, id: string): Promise<WeeklyMenu> {
  const out = await ddbDoc.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: pkUser(sub), SK: skMenu(id) },
  }));
  if (!out.Item) throw new Error("menu_not_found");
  return out.Item as unknown as WeeklyMenu;
}

async function savePreparedMarker(menu: WeeklyMenu, params: { scope: "all" | "weekdays" | "days"; days?: Day[]; dryRun: boolean }): Promise<WeeklyMenu> {
  const now = Date.now();
  const entry = {
    at: now,
    scope: params.scope,
    ...(params.days?.length ? { days: params.days } : {}),
    dryRun: !!params.dryRun,
  };
  const out = await ddbDoc.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: pkUser(menu.userSub), SK: skMenu(menu.id) },
    ConditionExpression: "#ver = :v",
    UpdateExpression: "SET #prepared = list_append(if_not_exists(#prepared, :empty), :entry), #ver = :v2, #updatedAt = :now",
    ExpressionAttributeNames: {
      "#prepared": "prepared",
      "#ver": "version",
      "#updatedAt": "updatedAt",
    },
    ExpressionAttributeValues: {
      ":entry": [entry],
      ":empty": [],
      ":v": menu.version,
      ":v2": menu.version + 1,
      ":now": now,
    },
    ReturnValues: "ALL_NEW",
  }));
  return out.Attributes as unknown as WeeklyMenu;
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const sub = getUserSubFromAuth((event.requestContext as any).authorizer);
    const id = event.pathParameters?.id!;
    const body: PrepareMenuRequest = event.body ? JSON.parse(event.body) : {};
    const scope: "all" | "weekdays" | "days" = (body.scope ?? "all");
    const days = body.days;
    const dryRun = !!body.dryRun;

    const menu = await getMenuById(sub, id);

    // Determinar días a preparar
    const selectedDays: Day[] =
      scope === "days" ? (days ?? []) as Day[] :
      scope === "weekdays" ? ["mon","tue","wed","thu","fri"] :
      (Object.keys(menu.days || {}) as Day[]);

    // Consolidar necesidades por ingrediente (suma de cantidades)
    type Need = { name: string; quantity: number; unit: Unit };
    const needs = new Map<string, Need>(); // key = name_normalized
    for (const d of selectedDays) {
      const r = menu.days?.[d];
      if (!r?.ingredients) continue;
      for (const ing of r.ingredients) {
        const key = normalizeName(ing.name);
        const prev = needs.get(key);
        if (prev) prev.quantity += ing.quantity;
        else needs.set(key, { name: ing.name, quantity: ing.quantity, unit: ing.unit });
      }
    }

    // Calcular shortages y updates propuestos
    const shortages: Array<{
      name: string;
      required: { quantity: number; unit: Unit };
      available?: { quantity: number; unit: Unit };
      missing: { quantity: number; unit: Unit };
      reason: "not_found" | "insufficient" | "unit_mismatch";
    }> = [];

    const updates: PantryUpdate[] = [];

    for (const need of needs.values()) {
      const pantry = await findPantryByName(sub, need.name);
      if (!pantry) {
        shortages.push({
          name: need.name,
          required: { quantity: need.quantity, unit: need.unit },
          missing: { quantity: need.quantity, unit: need.unit },
          reason: "not_found",
        });
        continue;
      }
      if (need.unit !== pantry.unit && !isConvertible(need.unit, pantry.unit)) {
        shortages.push({
          name: pantry.name,
          required: { quantity: need.quantity, unit: need.unit },
          available: { quantity: pantry.quantity, unit: pantry.unit },
          missing: { quantity: need.quantity, unit: need.unit },
          reason: "unit_mismatch",
        });
        continue;
      }

      // Trabajar en unidades base para mass/volume
      const reqBase = toBase(need.quantity, need.unit);
      const availBase = toBase(pantry.quantity, pantry.unit);
      const newBase = Math.max(availBase.q - reqBase.q, 0);

      if (reqBase.q > availBase.q + 1e-9) {
        const missQ = reqBase.q - availBase.q;
        const factor = toBase(1, need.unit).q; // para expresar "missing" en unidad requerida
        shortages.push({
          name: pantry.name,
          required: { quantity: need.quantity, unit: need.unit },
          available: { quantity: pantry.quantity, unit: pantry.unit },
          missing: { quantity: +(missQ / factor).toFixed(3), unit: need.unit },
          reason: "insufficient",
        });
      }

      const newInPantry = fromBase(newBase, pantry.unit);
      if (newInPantry.q <= 0) {
        updates.push({
          action: "delete",
          id: pantry.id,
          name: pantry.name,
          from: { quantity: pantry.quantity, unit: pantry.unit },
          expectedVersion: pantry.version,
        });
      } else {
        updates.push({
          action: "update",
          id: pantry.id,
          name: pantry.name,
          from: { quantity: pantry.quantity, unit: pantry.unit },
          to: { quantity: +newInPantry.q.toFixed(3), unit: pantry.unit },
          expectedVersion: pantry.version,
        });
      }
    }

    // Aplicar descuentos si no es dryRun
    if (!dryRun && updates.length) {
      await applyPantryUpdates(sub, updates);
    }

    // Guardar marca de preparado (version++)
    const updated = await savePreparedMarker(menu, { scope, days: scope === "days" ? days as Day[] : undefined, dryRun });

    return json(200, {
      prepared: !dryRun,
      scope,
      days: scope === "days" ? days : undefined,
      shortages,
      pantryUpdates: updates.map(u => u.action === "delete"
        ? { id: u.id, name: u.name, from: u.from, action: "delete" as const }
        : { id: u.id, name: u.name, from: u.from, to: (u as any).to, action: "update" as const }),
      menu: { id: updated.id, version: updated.version, prepared: updated.prepared },
    });
  } catch (e: any) {
    const message = e?.message || String(e);
    const code = message === "menu_not_found" ? 404 : 500;
    return json(code, { code: message === "menu_not_found" ? "menu_not_found" : "internal_error", message });
  }
};
