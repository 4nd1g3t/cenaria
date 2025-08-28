export function normalizeName(input: string): string {
  if (!input) return "";
  const lower = input.toLowerCase().trim();
  // NFD + eliminar diacríticos
  return lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}