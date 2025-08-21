// lib/units.ts
export type Unit = "g" | "kg" | "ml" | "l" | "unit" | "cup" | "tbsp" | "tsp" | "pack" | "other";
type BaseKind = "mass" | "volume" | "other";

export type Day = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const UNITS = ["g", "kg", "ml", "l", "unit", "cup", "tbsp", "tsp", "pack", "other"];
export const CATEGORIES = [
  "verduras",
  "frutas",
  "carnes",
  "lácteos",
  "granos",
  "especias",
  "enlatados",
  "otros",
];


const BASE: Record<Unit, { kind: BaseKind; toBase: number; baseUnit: Unit }> = {
  g:    { kind: "mass",   toBase: 1,     baseUnit: "g"  },
  kg:   { kind: "mass",   toBase: 1000,  baseUnit: "g"  },
  ml:   { kind: "volume", toBase: 1,     baseUnit: "ml" },
  l:    { kind: "volume", toBase: 1000,  baseUnit: "ml" },
  unit: { kind: "other", toBase: 1, baseUnit: "unit" },
  cup:  { kind: "other", toBase: 1, baseUnit: "cup"  },
  tbsp: { kind: "other", toBase: 1, baseUnit: "tbsp"   },
  tsp:  { kind: "other", toBase: 1, baseUnit: "tsp"  },
  pack: { kind: "other", toBase: 1, baseUnit: "pack"  },
  other:{ kind: "other", toBase: 1, baseUnit: "other"  },
};

export function isConvertible(a: Unit, b: Unit): boolean {
  const A = BASE[a]; const B = BASE[b];
  return !!A && !!B && A.kind !== "other" && A.kind === B.kind;
}

export function toBase(quantity: number, unit: Unit): { q: number; unit: Unit } {
  const m = BASE[unit];
  if (!m) throw new Error(`Unknown unit: ${unit}`);
  return { q: quantity * m.toBase, unit: m.baseUnit };
}

export function fromBase(qBase: number, targetUnit: Unit): { q: number; unit: Unit } {
  const m = BASE[targetUnit];
  if (!m) throw new Error(`Unknown unit: ${targetUnit}`);
  if (m.kind === "other") return { q: qBase, unit: targetUnit };
  return { q: qBase / m.toBase, unit: targetUnit };
}

export function convert(quantity: number, from: Unit, to: Unit): { q: number; unit: Unit } {
  if (from === to) return { q: quantity, unit: to };
  if (!isConvertible(from, to)) throw new Error(`Incompatible units: ${from} -> ${to}`);
  const { q: baseQ } = toBase(quantity, from);
  return fromBase(baseQ, to);
}
