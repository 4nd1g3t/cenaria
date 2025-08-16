export type Unit = 'g'|'kg'|'ml'|'l'|'pieza'|'taza'|'cda'|'cdta';
export type Category = 'verduras'|'frutas'|'carnes'|'lácteos'|'granos'|'especias'|'enlatados'|'otros';

export interface PantryItem {
  id: string;              // ulid
  name: string;
  quantity: number;        // >= 0
  unit: Unit;
  category: Category;
  perishable?: boolean;
  notes?: string;
  createdAt: number;       // epoch ms
  updatedAt: number;       // epoch ms
  version: number;         // OCC
}

export interface NewPantryItem {
  name: string;
  quantity: number;
  unit: Unit;
  category?: Category;
  perishable?: boolean;
  notes?: string;
}