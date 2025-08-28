"use client";
import "../style/pantry.list.css";
import { useMemo, useState } from "react";
import IngredientForm from "./PantryForm";
import type { PantryItem, NewPantryItem, Category } from "@/lib/pantry";

const INITIAL_ITEMS: PantryItem[] = [
  { id: "1", name: "Arroz", quantity: 2, unit: "kg", category: "granos", version: 1},//, createdAt: Date.now(), updatedAt: Date.now() },
  { id: "2", name: "Leche", quantity: 1, unit: "l", category: "lácteos", version: 1},//, createdAt: Date.now(), updatedAt: Date.now() },
  { id: "3", name: "Manzanas", quantity: 5, unit: "pieza", category: "frutas", version: 1},//, createdAt: Date.now(), updatedAt: Date.now() },
  { id: "4", name: "Pan integral", quantity: 1, unit: "pieza", category: "otros", version: 1},//, createdAt: Date.now(), updatedAt: Date.now() },
  { id: "5", name: "Papas", quantity: 800, unit: "g", category: "verduras", version: 1},//, createdAt: Date.now(), updatedAt: Date.now() },
  { id: "6", name: "Pollo", quantity: 500, unit: "g", category: "carnes", version: 1},//, createdAt: Date.now(), updatedAt: Date.now() },
];
const CATEGORIES: Category[] = ["verduras","frutas","carnes","lácteos","granos","especias","enlatados","otros"];

export default function PantryClient() {
  const [items, setItems] = useState<PantryItem[]>(INITIAL_ITEMS);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"" | Category>("");
  const [openForm, setOpenForm] = useState<null | {mode:"create"} | {mode:"edit", item:PantryItem}>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(i => (!category || i.category === category) && (!q || i.name.toLowerCase().includes(q)));
  }, [items, query, category]);

  function handleCreate(payload: NewPantryItem) { /* ...igual... */ }
  function handleUpdate(id: string, payload: NewPantryItem) { /* ...igual... */ }
  function handleDelete(id: string) { setItems(p => p.filter(i => i.id !== id)); }

  return (
    <div className="card">
      <div>
        <h1 className="title">Despensa</h1>
        <p className="subtitle">Gestiona tus ingredientes y cantidades.</p>
      </div>

      <div className="toolbar">
        <select className="select" value={category} onChange={(e)=>setCategory(e.target.value as any)}>
          <option value="">Todas las categorías</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <input className="input" placeholder="Buscar ingredientes…" value={query} onChange={(e)=>setQuery(e.target.value)} />
        <button className="btnCta" onClick={() => setOpenForm({ mode: "create" })}>Agregar</button>
      </div>

      <div className="list">
        {filtered.length === 0 ? (
          <div className="empty">
            <p className="text-lg font-medium">Aún no hay ingredientes</p>
            <p className="text-sm opacity-70">Haz clic en “Agregar” para registrar el primero.</p>
          </div>
        ) : filtered.map(i => (
          <div key={i.id} className="row">
            <div className="name">{i.name}</div>
            <div className="qty">{i.quantity} {i.unit}</div>
            <div className="flex-1">
              <span className="chip" data-cat={i.category}>{i.category}</span>
            </div>
            <div className="actions">
              <button className="btnOutline" onClick={()=>setOpenForm({ mode:"edit", item:i })}>Editar</button>
              <button className="btnDanger" onClick={()=>handleDelete(i.id)}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>

      {openForm && (
        <IngredientForm
          open
          mode={openForm.mode}
          item={openForm.mode === "edit" ? openForm.item : undefined}
          onCancel={() => setOpenForm(null)}
          onCreate={(p)=>handleCreate(p)}
          onUpdate={(id,p)=>handleUpdate(id,p)}
        />
      )}
    </div>
  );
}










/*
// src/components/pantry/PantryList.tsx
import RowActions from "./RowActions";
import type { PantryItem } from "@/lib/pantry";

export default function PantryList({ items }: { items: PantryItem[] }) {
  if (!items?.length) return <p className="text-sm text-gray-500">Sin elementos aún.</p>;
  return (
    <table className="w-full border-separate border-spacing-y-2">
      <thead>
        <tr className="text-left text-sm text-gray-600">
          <th className="px-2">Nombre</th>
          <th className="px-2">Cantidad</th>
          <th className="px-2">Unidad</th>
          <th className="px-2">Categoria</th>
          <th className="px-2"/>
        </tr>
      </thead>
      <tbody>
        {items.map((it) => (
          <tr key={it.id} className="bg-white shadow-sm">
            <td className="px-2 py-2">{it.name}</td>
            <td className="px-2 py-2">{it.quantity ?? ""}</td>
            <td className="px-2 py-2">{it.unit ?? ""}</td>
            <td className="px-2 py-2">{it.category ?? ""}</td>
            <td className="px-2 py-2">
              <RowActions id={it.id} version={it.version} name={it.name} quantity={it.quantity} unit={it.unit} category={it.category} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
  */