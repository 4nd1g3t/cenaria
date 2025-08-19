// /src/app/menu/menu-model.ts

/** Días válidos (ISO con semana iniciando en lunes) */
export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/** Ingrediente de una receta */
export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

/** Receta (ítem por día) */
export interface RecipeItem {
  id: string;
  title: string;
  servings: number;        // >=1
  durationMin: number;     // >=1 (minutos)
  calories?: number;
  imageUrl?: string;
  steps: string[];
  ingredients: RecipeIngredient[];
}

/** Alcance del menú generado */
export type MenuScope = 'full_week' | 'weekdays' | 'custom';

/** Registro de una ejecución de "preparar" */
export interface PreparedEntry {
  at: number; // epoch ms
  scope: 'all' | 'weekdays' | 'days';
  days?: DayKey[];
  dryRun: boolean;
}

/** Estado de un menú */
export type MenuStatus = 'draft' | 'final';

/** Menú semanal */
export interface WeeklyMenu {
  // Claves de single-table (opcional en frontend, útil en backend)
  PK?: `USER#${string}`;
  SK?: `MENU#${string}`;
  entity?: 'WEEKLY_MENU';

  id: string;
  userSub: string;
  /** YYYY-MM-DD del lunes correspondiente */
  weekStart: string;

  persons: number; // 1..12
  scope: MenuScope;

  /** Mapa parcial mon..sun según el scope */
  days: Partial<Record<DayKey, RecipeItem>>;

  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
  version: number;   // ++ en escrituras (OCC)
  status: MenuStatus;

  prepared?: PreparedEntry[];
  finalizedAt?: number;
}

/** Filtros y restricciones de generación/reemplazo */
export interface GenerationConstraints {
  maxDurationMin?: number;                 // 10..180
  avoidCategories?: string[];
  avoidIngredients?: string[];
  dietary?: Array<'vegetarian' | 'vegan' | 'gluten_free' | 'low_carb'>;
}

/** POST /v1/menu  */
export interface GenerateMenuRequest {
  persons?: number;                         // 1..12 (default 2)
  daysMode?: 'full_week' | 'weekdays';      // si envías days[], el scope pasa a 'custom'
  days?: DayKey[];
  constraints?: GenerationConstraints;
  usePantry?: boolean;                      // default true
}

/**
 * PATCH /v1/menu/{id}
 * Variante que pedimos: reemplazo automático con (opcional) nuevas restricciones.
 * (Si en algún handler soportas mandar recipe explícita, puedes crear un tipo alternativo).
 */
export interface ReplaceRecipeRequest {
  day: DayKey;
  persons?: number;
  constraints?: GenerationConstraints;
  usePantry?: boolean; // default true
}

/** POST /v1/menu/{id}/prepare */
export interface PrepareMenuRequest {
  scope?: 'all' | 'weekdays' | 'days';  // default 'all'
  days?: DayKey[];                      // requerido si scope='days'
  dryRun?: boolean;                     // default false
}

/** Faltante detectado durante preparación */
export type ShortageReason = 'unit_mismatch' | 'not_found' | 'insufficient';

export interface Shortage {
  name: string;
  required: { quantity: number; unit: string };
  available?: { quantity: number; unit: string };
  missing: { quantity: number; unit: string };
  reason: ShortageReason;
}

/** Propuesta/resultado de actualización en despensa al preparar */
export interface PantryUpdate {
  id: string;
  name: string;
  from: { quantity: number; unit: string };
  to: { quantity: number; unit: string };
  action: 'update' | 'delete';
}

/** Respuesta de preparación (simulación o ejecución) */
export interface PrepareMenuResponse {
  prepared: boolean;                              // false si dryRun
  scope: 'all' | 'weekdays' | 'days';
  days?: DayKey[];
  shortages: Shortage[];
  pantryUpdates: PantryUpdate[];
  menu: WeeklyMenu;                                // en real suele venir actualizado
}

/** Listado de menús (GET /v1/menu) */
export interface ListMenusItem {
  id: string;
  weekStart: string;
  persons: number;
  scope: MenuScope;
  status: MenuStatus;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface ListMenusResponse {
  items: ListMenusItem[];
  nextCursor?: string;
}
