export type Unit = "g"|"kg"|"ml"|"l"|"pieza"|"taza"|"cda"|"cdta";

export function toBase(quantity: number, unit: Unit): { qty: number; base: "g"|"ml"|"piece" } {
  switch (unit) {
    case "g":  return { qty: quantity, base: "g" };
    case "kg": return { qty: quantity * 1000, base: "g" };
    case "ml": return { qty: quantity, base: "ml" };
    case "l":  return { qty: quantity * 1000, base: "ml" };
    case "pieza": return { qty: quantity, base: "piece" };
    default: return { qty: NaN, base: "g" }; // otras: sin soporte de conversión por ahora
  }
}
