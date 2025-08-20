// lib/units.ts
export type Unit = "g" | "kg" | "ml" | "l" | "pieza" | "taza" | "cda" | "cdta";
type BaseKind = "mass" | "volume" | "other";

const BASE: Record<Unit, { kind: BaseKind; toBase: number; baseUnit: Unit }> = {
  g:   { kind: "mass",   toBase: 1,     baseUnit: "g"  },
  kg:  { kind: "mass",   toBase: 1000,  baseUnit: "g"  },
  ml:  { kind: "volume", toBase: 1,     baseUnit: "ml" },
  l:   { kind: "volume", toBase: 1000,  baseUnit: "ml" },
  pieza: { kind: "other", toBase: 1, baseUnit: "pieza" },
  taza:  { kind: "other", toBase: 1, baseUnit: "taza"  },
  cda:   { kind: "other", toBase: 1, baseUnit: "cda"   },
  cdta:  { kind: "other", toBase: 1, baseUnit: "cdta"  },
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
