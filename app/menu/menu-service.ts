import type {
  WeeklyMenu, RecipeItem, DayKey,
  GenerateMenuRequest, ReplaceRecipeRequest,
  PrepareMenuRequest, PrepareMenuResponse
} from "./menu-model";
import { listPantryForUser, getMenuById as _getMenuById, saveMenu, updateMenu } from "@/lib/data";
import { weekStartMondayISO, ensureScopeFromRequest, nextVersion } from "@/lib/menu-aggregate";
import { diffShortagesAndUpdates } from "@/lib/shopping-diff";

function synthRecipe(title: string, servings: number, durationMin = 25): RecipeItem {
  return {
    id: crypto.randomUUID(),
    title, servings, durationMin,
    steps: ["Preparar", "Cocinar", "Servir"],
    ingredients: [
      { name: "arroz", quantity: 120, unit: "g" },
      { name: "pollo", quantity: 300, unit: "g" }
    ]
  };
}

export async function generateMenu(userSub: string, req: GenerateMenuRequest): Promise<WeeklyMenu> {
  const now = Date.now();
  const weekStart = weekStartMondayISO(new Date());
  const persons = req.persons ?? 2;
  const scope = ensureScopeFromRequest(req);

  // Boceto simple (ejemplo). En futuro: usar modelo/recetario y `usePantry`.
  const base: Partial<Record<DayKey, RecipeItem>> = {};
  const pool = [
    "Pollo al limón", "Pasta rápida", "Tacos de verduras",
    "Salmón al horno", "Ensalada completa", "Curry suave", "Sopa de tomate"
  ];
  const days: DayKey[] = ["mon","tue","wed","thu","fri","sat","sun"];
  for (let i=0;i<days.length;i++){
    const d = days[i] as DayKey;
    base[d] = synthRecipe(`${pool[i]}`, persons, 20 + (i%3)*10);
  }

  const menu: WeeklyMenu = {
    id: crypto.randomUUID(),
    userSub,
    weekStart,
    persons,
    scope,
    days: base,
    createdAt: now,
    updatedAt: now,
    version: 1,
    status: "draft"
  };
  return saveMenu(menu);
}

export function getMenuById(userSub: string, id: string) {
  return _getMenuById(userSub, id);
}

export async function replaceRecipe(userSub: string, id: string, body: ReplaceRecipeRequest, ifMatch?: number) {
  const menu = await _getMenuById(userSub, id);
  if (menu.status === "final") throw new Error("Menu is finalized");
  const persons = body.persons ?? menu.persons;
  const updated: WeeklyMenu = {
    ...menu,
    days: { ...menu.days, [body.day]: synthRecipe("Receta nueva", persons) },
    updatedAt: Date.now(),
    version: nextVersion(menu.version)
  };
  return updateMenu(updated, ifMatch);
}

export async function finalizeMenu(userSub: string, id: string, ifMatch?: number) {
  const menu = await _getMenuById(userSub, id);
  if (menu.status === "final") return menu;
  const updated: WeeklyMenu = {
    ...menu,
    status: "final",
    finalizedAt: Date.now(),
    updatedAt: Date.now(),
    version: nextVersion(menu.version)
  };
  return updateMenu(updated, ifMatch);
}

export async function prepareMenu(userSub: string, id: string, req: PrepareMenuRequest): Promise<PrepareMenuResponse> {
  const menu = await _getMenuById(userSub, id);
  const { items: pantryItems } = await listPantryForUser(userSub);
  const { shortages, pantryUpdates } = diffShortagesAndUpdates(menu, pantryItems, req);



  const preparedAt = Date.now();
  const preparedEntry = { at: preparedAt, scope: req.scope ?? "all", days: req.days, dryRun: !!req.dryRun };
  const next: WeeklyMenu = {
    ...menu,
    prepared: [...(menu.prepared ?? []), preparedEntry],
    updatedAt: preparedAt,
    version: req.dryRun ? menu.version : nextVersion(menu.version)
  };

  const finalMenu = req.dryRun ? menu : await updateMenu(next);
  return {
    prepared: !req.dryRun,
    scope: preparedEntry.scope,
    days: preparedEntry.days,
    shortages,
    pantryUpdates,
    menu: finalMenu
  };
}
