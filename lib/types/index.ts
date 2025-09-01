// lib/types/index.ts - Central type definitions

export type Unit = 
  | "g" | "kg"           // Mass
  | "ml" | "l"           // Volume  
  | "pieza"     // Count
  | "taza"       // Volume (cooking)
  | "cda"       // Tablespoon
  | "cdta"       // Teaspoon
  | "other";

export type Day = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type Category =
  | "verduras" | "frutas" | "carnes" | "lácteos" 
  | "granos" | "especias" | "enlatados" | "otros";

export type MenuScope = "full_week" | "weekdays" | "custom";
export type MenuStatus = "draft" | "final";

// Auth types
export interface AuthActionError {
  code: string;
  message: string;
  status?: number;
}

export interface AuthActionState {
  ok: boolean;
  next?: string;
  error?: AuthActionError;
}

export interface ApiStatusError {
  status?: number;
  response?: { status?: number };
  message?: string;
}

// Pantry types
export interface PantryItem {
  id: string;
  name: string;
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
  quantity: number;
  unit: Unit;
  category?: Category;
  perishable?: boolean;
  notes?: string;
}

export interface ListPantryResponse {
  items: PantryItem[];
  nextCursor?: string;
}

// Recipe types
export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface RecipeItem {
  id: string;
  title: string;
  servings: number;
  durationMin: number;
  calories?: number;
  imageUrl?: string;
  steps: string[];
  ingredients: RecipeIngredient[];
}

// Menu types
export interface WeeklyMenu {
  id: string;
  userSub: string;
  weekStart: string;
  persons: number;
  scope: MenuScope;
  days: Partial<Record<Day, RecipeItem>>;
  status: MenuStatus;
  version: number;
  prepared?: Array<{
    at: number;
    scope: "all" | "weekdays" | "days";
    days?: Day[];
    dryRun: boolean;
  }>;
}

export interface GenerateMenuRequest {
  persons?: number;
  daysMode?: "full_week" | "weekdays";
  days?: Day[];
  constraints?: {
    maxDurationMin?: number;
    avoidCategories?: string[];
    avoidIngredients?: string[];
    dietary?: string[];
  };
  usePantry?: boolean;
}

export interface PrepareMenuRequest {
  scope?: "all" | "weekdays" | "days";
  days?: Day[];
  dryRun?: boolean;
}

// Shopping diff types
export type ShortageReason = 'unit_mismatch' | 'not_found' | 'insufficient';

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
  to: { quantity: number; unit: string };
  action: 'update' | 'delete';
}