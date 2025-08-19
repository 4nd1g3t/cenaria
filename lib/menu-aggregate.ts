import type { GenerateMenuRequest, MenuScope } from "@/app/menu/menu-model";

export function weekStartMondayISO(d: Date): string {
  const day = d.getDay(); // 0..6 (0=Dom)
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0,0,0,0);
  return monday.toISOString().slice(0,10);
}

export function ensureScopeFromRequest(req: GenerateMenuRequest): MenuScope {
  if (req.days?.length) return "custom";
  return (req.daysMode ?? "full_week");
}

export function nextVersion(v: number): number {
  return (Number.isFinite(v) ? v : 0) + 1;
}
