// lib/units/index.ts
import type { Unit, Day, Category } from '@/lib/types';

// Unit definitions with conversions
type UnitCategory = "mass" | "volume" | "count" | "other";

interface UnitDefinition {
  category: UnitCategory;
  baseUnit: Unit;
  conversionFactor: number; // Factor to convert to base unit
  displayName: {
    en: string;
    es: string;
  };
  abbreviation: {
    en: string;
    es: string;
  };
}

export const UNIT_DEFINITIONS: Record<Unit, UnitDefinition> = {
  // Mass units (base: g)
  g: {
    category: "mass",
    baseUnit: "g",
    conversionFactor: 1,
    displayName: { en: "grams", es: "gramos" },
    abbreviation: { en: "g", es: "g" },
  },
  kg: {
    category: "mass",
    baseUnit: "g",
    conversionFactor: 1000,
    displayName: { en: "kilograms", es: "kilogramos" },
    abbreviation: { en: "kg", es: "kg" },
  },

  // Volume units (base: ml)
  ml: {
    category: "volume",
    baseUnit: "ml",
    conversionFactor: 1,
    displayName: { en: "milliliters", es: "mililitros" },
    abbreviation: { en: "ml", es: "ml" },
  },
  l: {
    category: "volume",
    baseUnit: "ml",
    conversionFactor: 1000,
    displayName: { en: "liters", es: "litros" },
    abbreviation: { en: "l", es: "l" },
  },
  cup: {
    category: "volume",
    baseUnit: "ml",
    conversionFactor: 240, // US cup
    displayName: { en: "cups", es: "tazas" },
    abbreviation: { en: "cup", es: "taza" },
  },
  taza: {
    category: "volume",
    baseUnit: "ml",
    conversionFactor: 240,
    displayName: { en: "cups", es: "tazas" },
    abbreviation: { en: "cup", es: "taza" },
  },
  tbsp: {
    category: "volume",
    baseUnit: "ml",
    conversionFactor: 15,
    displayName: { en: "tablespoons", es: "cucharadas" },
    abbreviation: { en: "tbsp", es: "cda" },
  },
  cda: {
    category: "volume",
    baseUnit: "ml",
    conversionFactor: 15,
    displayName: { en: "tablespoons", es: "cucharadas" },
    abbreviation: { en: "tbsp", es: "cda" },
  },
  tsp: {
    category: "volume",
    baseUnit: "ml",
    conversionFactor: 5,
    displayName: { en: "teaspoons", es: "cucharaditas" },
    abbreviation: { en: "tsp", es: "cdta" },
  },
  cdta: {
    category: "volume",
    baseUnit: "ml",
    conversionFactor: 5,
    displayName: { en: "teaspoons", es: "cucharaditas" },
    abbreviation: { en: "tsp", es: "cdta" },
  },

  // Count units
  unit: {
    category: "count",
    baseUnit: "unit",
    conversionFactor: 1,
    displayName: { en: "units", es: "unidades" },
    abbreviation: { en: "unit", es: "pieza" },
  },
  pieza: {
    category: "count",
    baseUnit: "unit",
    conversionFactor: 1,
    displayName: { en: "pieces", es: "piezas" },
    abbreviation: { en: "pc", es: "pieza" },
  },
  pack: {
    category: "count",
    baseUnit: "unit",
    conversionFactor: 1,
    displayName: { en: "packs", es: "paquetes" },
    abbreviation: { en: "pack", es: "paq" },
  },

  // Other
  other: {
    category: "other",
    baseUnit: "other",
    conversionFactor: 1,
    displayName: { en: "other", es: "otro" },
    abbreviation: { en: "other", es: "otro" },
  },
};

// Validation functions
export function isValidUnit(unit: string): unit is Unit {
  return unit in UNIT_DEFINITIONS;
}

export function validateUnit(unit: string): Unit {
  if (!isValidUnit(unit)) {
    throw new Error(`Invalid unit: ${unit}`);
  }
  return unit;
}

// Conversion functions
export function canConvert(fromUnit: Unit, toUnit: Unit): boolean {
  const from = UNIT_DEFINITIONS[fromUnit];
  const to = UNIT_DEFINITIONS[toUnit];
  
  return from.category === to.category && from.category !== "other";
}

export function convertQuantity(
  quantity: number,
  fromUnit: Unit,
  toUnit: Unit
): number {
  if (fromUnit === toUnit) return quantity;
  
  if (!canConvert(fromUnit, toUnit)) {
    throw new Error(`Cannot convert from ${fromUnit} to ${toUnit}`);
  }

  const from = UNIT_DEFINITIONS[fromUnit];
  const to = UNIT_DEFINITIONS[toUnit];

  // Convert to base unit, then to target unit
  const baseQuantity = quantity * from.conversionFactor;
  return baseQuantity / to.conversionFactor;
}

// Normalization (convert to base units for storage/comparison)
export function normalizeQuantity(quantity: number, unit: Unit): {
  quantity: number;
  unit: Unit;
} {
  const definition = UNIT_DEFINITIONS[unit];
  return {
    quantity: quantity * definition.conversionFactor,
    unit: definition.baseUnit,
  };
}

// Display utilities
export function formatUnit(unit: Unit, locale: 'en' | 'es' = 'es'): string {
  return UNIT_DEFINITIONS[unit].abbreviation[locale];
}

export function formatQuantity(
  quantity: number,
  unit: Unit,
  locale: 'en' | 'es' = 'es'
): string {
  const unitStr = formatUnit(unit, locale);
  return `${quantity} ${unitStr}`;
}

// Constants for UI
export const UNITS = Object.keys(UNIT_DEFINITIONS) as Unit[];

export const UNIT_OPTIONS = UNITS.map(unit => ({
  value: unit,
  label: formatUnit(unit, 'es'),
  category: UNIT_DEFINITIONS[unit].category,
}));

export const MASS_UNITS = UNITS.filter(
  unit => UNIT_DEFINITIONS[unit].category === "mass"
);

export const VOLUME_UNITS = UNITS.filter(
  unit => UNIT_DEFINITIONS[unit].category === "volume"
);

export const COUNT_UNITS = UNITS.filter(
  unit => UNIT_DEFINITIONS[unit].category === "count"
);

// Day utilities
export const DAYS: Day[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const DAY_NAMES = {
  en: {
    mon: "Monday", tue: "Tuesday", wed: "Wednesday",
    thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday"
  },
  es: {
    mon: "Lunes", tue: "Martes", wed: "Miércoles",
    thu: "Jueves", fri: "Viernes", sat: "Sábado", sun: "Domingo"
  }
} as const;

export function formatDay(day: Day, locale: 'en' | 'es' = 'es'): string {
  return DAY_NAMES[locale][day];
}

// Category utilities
export const CATEGORIES: Category[] = [
  "verduras", "frutas", "carnes", "lácteos",
  "granos", "especias", "enlatados", "otros"
];

export const CATEGORY_NAMES = {
  en: {
    verduras: "Vegetables", frutas: "Fruits", carnes: "Meats",
    lácteos: "Dairy", granos: "Grains", especias: "Spices",
    enlatados: "Canned", otros: "Others"
  },
  es: {
    verduras: "Verduras", frutas: "Frutas", carnes: "Carnes",
    lácteos: "Lácteos", granos: "Granos", especias: "Especias",
    enlatados: "Enlatados", otros: "Otros"
  }
} as const;

export function formatCategory(category: Category, locale: 'en' | 'es' = 'es'): string {
  return CATEGORY_NAMES[locale][category];
}