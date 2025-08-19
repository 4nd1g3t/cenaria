import type { WeeklyMenu, RecipeItem, DayKey, PrepareMenuRequest } from "@/app/menu/menu-model";

export interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  // ...otros campos no necesarios para el diff
}

export type ShortageReason = 'unit_mismatch'|'not_found'|'insufficient';

export interface Shortage {
  name: string;
  required: { quantity: number; unit: string };
  available?: { quantity: number; unit: string };
  missing: { quantity: number; unit: string };
  reason: ShortageReason;
}

export interface PantryUpdate {
  id: string;
  name: string;
  from: { quantity: number; unit: string };
  to:   { quantity: number; unit: string };
  action: 'update'|'delete';
}

// Normaliza a minúsculas sin acentos para comparar nombres
function normalizeName(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

function isConvertibleUnit(a: string, b: string): boolean {
  const mass = new Set(['g','kg']);
  const vol  = new Set(['ml','l']);
  if (a === b) return true;
  if (mass.has(a) && mass.has(b)) return true;
  if (vol.has(a) && vol.has(b)) return true;
  return false;
}

function convertQty(q: number, from: string, to: string): number | undefined {
  if (from === to) return q;
  if (from === 'kg' && to === 'g') return q * 1000;
  if (from === 'g'  && to === 'kg') return q / 1000;
  if (from === 'l'  && to === 'ml') return q * 1000;
  if (from === 'ml' && to === 'l')  return q / 1000;
  return undefined;
}

function collectNeeded(menu: WeeklyMenu, scope: PrepareMenuRequest['scope'], days?: DayKey[]): Record<string, { quantity: number; unit: string }> {
  const needed: Record<string, { quantity: number; unit: string }> = {};
  const dayKeys: DayKey[] =
    (scope === 'days' && days?.length) ? days :
    (menu.scope === 'weekdays' ? ['mon','tue','wed','thu','fri'] as DayKey[] :
      ['mon','tue','wed','thu','fri','sat','sun'] as DayKey[]);

  for (const d of dayKeys) {
    const recipe: RecipeItem | undefined = menu.days[d];
    if (!recipe) continue;
    for (const ing of recipe.ingredients) {
      const key = normalizeName(ing.name);
      if (!needed[key]) needed[key] = { quantity: 0, unit: ing.unit };
      // si cambia la unidad entre ingredientes del mismo nombre, conservamos la primera
      needed[key].quantity += ing.quantity;
    }
  }
  return needed;
}

export function diffShortagesAndUpdates(
  menu: WeeklyMenu,
  pantryResp: { items: PantryItem[]; nextCursor?: string } | PantryItem[],
  req: PrepareMenuRequest
): { shortages: Shortage[]; pantryUpdates: PantryUpdate[] } {
  const pantryItems: PantryItem[] = Array.isArray(pantryResp) ? pantryResp : pantryResp.items;
  const byName = new Map<string, PantryItem[]>(pantryItems.map(p => [normalizeName(p.name), []]));
  // agrupa por nombre normalizado
  for (const p of pantryItems) {
    const k = normalizeName(p.name);
    const arr = byName.get(k);
    if (arr) arr.push(p);
    else byName.set(k, [p]);
  }

  const needed = collectNeeded(menu, req.scope ?? 'all', req.days);
  const shortages: Shortage[] = [];
  const updates: PantryUpdate[] = [];

  for (const [nName, reqAgg] of Object.entries(needed)) {
    const have = byName.get(nName);
    if (!have || have.length === 0) {
      shortages.push({
        name: nName,
        required: { quantity: reqAgg.quantity, unit: reqAgg.unit },
        missing:  { quantity: reqAgg.quantity, unit: reqAgg.unit },
        reason: 'not_found'
      });
      continue;
    }
    // suma disponible (conversión si aplica)
    let availableQty = 0;
    let unitMismatch = false;
    for (const p of have) {
      if (!isConvertibleUnit(p.unit, reqAgg.unit)) { unitMismatch = true; break; }
      const conv = convertQty(p.quantity, p.unit, reqAgg.unit);
      if (typeof conv !== 'number') { unitMismatch = true; break; }
      availableQty += conv;
    }
    if (unitMismatch) {
      shortages.push({
        name: nName,
        required: { quantity: reqAgg.quantity, unit: reqAgg.unit },
        available: { quantity: have.reduce((s, p) => s + p.quantity, 0), unit: have[0].unit },
        missing:  { quantity: reqAgg.quantity, unit: reqAgg.unit },
        reason: 'unit_mismatch'
      });
      continue;
    }
    if (availableQty < reqAgg.quantity) {
      shortages.push({
        name: nName,
        required: { quantity: reqAgg.quantity, unit: reqAgg.unit },
        available: { quantity: availableQty, unit: reqAgg.unit },
        missing:  { quantity: reqAgg.quantity - availableQty, unit: reqAgg.unit },
        reason: 'insufficient'
      });
      // también descontamos lo que sí hay
    }

    // construir updates: vamos descontando en orden
    let toConsume = Math.min(availableQty, reqAgg.quantity);
    for (const p of have) {
      if (toConsume <= 0) break;
      const conv = convertQty(p.quantity, p.unit, reqAgg.unit)!; // seguro por chequeo previo
      const consumeHere = Math.min(conv, toConsume);
      const remainingConv = conv - consumeHere;
      // convertimos de vuelta a la unidad original del ítem
      const remainingOrig = convertQty(remainingConv, reqAgg.unit, p.unit);
      if (remainingOrig === undefined) continue; // no debería pasar

      if (remainingOrig > 0) {
        updates.push({
          id: p.id,
          name: p.name,
          from: { quantity: p.quantity, unit: p.unit },
          to:   { quantity: remainingOrig, unit: p.unit },
          action: 'update'
        });
      } else {
        updates.push({
          id: p.id,
          name: p.name,
          from: { quantity: p.quantity, unit: p.unit },
          to:   { quantity: 0, unit: p.unit },
          action: 'delete'
        });
      }
      toConsume -= consumeHere;
    }
  }

  return { shortages, pantryUpdates: updates };
}
