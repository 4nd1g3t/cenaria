"use client";
import "../style/pantry.form.css";
import { useEffect, useMemo, useState } from "react";
import type { PantryItem, NewPantryItem, Unit, Category } from "@/lib/pantry";


export default function IngredientForm({ open, mode, item, onCancel, onCreate, onUpdate }: {

  open: boolean; mode: "create"|"edit"; item?: PantryItem;
  onCancel: ()=>void; onCreate:(p:NewPantryItem)=>void; onUpdate:(id:string,p:NewPantryItem)=>void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [quantity, setQuantity] = useState<number>(item?.quantity ?? 0);
  const [unit, setUnit] = useState<Unit>(item?.unit ?? "g");
  const [category, setCategory] = useState<Category>(item?.category ?? "otros");
  const [perishable, setPerishable] = useState<boolean>(item?.perishable ?? false);
  const [notes, setNotes] = useState<string>(item?.notes ?? "");
  const disabled = useMemo(() => !name || quantity < 0, [name, quantity]);

  useEffect(() => {
    if (!open) return;
    setName(item?.name ?? "");
    setQuantity(item?.quantity ?? 0);
    setUnit(item?.unit ?? "g");
    setCategory(item?.category ?? "otros");
    setPerishable(item?.perishable ?? false);
    setNotes(item?.notes ?? "");
  }, [open, item]);

  function submit() {
    const payload: NewPantryItem = { name: name.trim(), quantity: Number(quantity), unit, category, perishable, notes: notes || undefined };
    if (mode === "create") onCreate(payload);
    else if (item) onUpdate(item.id, payload);
  }

  if (!open) return null;
  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="overlay" onClick={onCancel} />
      <div className="panel">
        <h2 className="text-xl font-semibold">{mode==="create"?"Agregar ingrediente":"Editar ingrediente"}</h2>

        <div className={`grid mt-4`}>
          <label className="flex flex-col gap-1">
            <span className="label">Nombre</span>
            <input className="input" value={name} onChange={(e)=>setName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Cantidad</span>
            <input type="number" min={0} className="input" value={quantity} onChange={(e)=>setQuantity(Number(e.target.value))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Unidad</span>
            <select className="select" value={unit} onChange={(e)=>setUnit(e.target.value as Unit)}>
              {["g","kg","ml","l","pieza","taza","cda","cdta"].map(u=><option key={u} value={u}>{u}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Categoría</span>
            <select className="select" value={category} onChange={(e)=>setCategory(e.target.value as Category)}>
              {["verduras","frutas","carnes","lácteos","granos","especias","enlatados","otros"].map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className={`"row col-span-full`}>
            <input type="checkbox" checked={perishable} onChange={(e)=>setPerishable(e.target.checked)} />
            <span>Perecedero</span>
          </label>
          <label className="flex flex-col gap-1 col-span-full">
            <span className="label">Notas</span>
            <textarea rows={3} className="textarea" value={notes} onChange={(e)=>setNotes(e.target.value)} />
          </label>
        </div>

        <div className="actions">
          <button className="btn" onClick={onCancel}>Cancelar</button>
          <button className="btn btnPrim" disabled={!name || quantity < 0} onClick={submit}>
            {mode==="create"?"Guardar":"Actualizar"}
          </button>
        </div>
      </div>
    </div>
  );
}











/*"use client";

import { useFormStatus } from "react-dom";
import { createItemActionVoid } from "@/app/pantry/actions";
import { UNITS, CATEGORIES } from "@/lib/units";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      disabled={pending}
    >
      {pending ? "Agregando…" : "Agregar"}
    </button>
  );
}

export default function PantryForm() {
  return (
    <form action={createItemActionVoid} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <label className="col-span-2">
          <span className="block text-sm text-gray-600">Nombre</span>
          <input
            name="name"
            required
            minLength={2}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="ej. Arroz"
          />
        </label>

        <label>
          <span className="block text-sm text-gray-600">Cantidad</span>
          <input
            name="quantity"
            type="number"
            step="any"
            min={0}
            defaultValue={0}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="0"
          />
        </label>

        <label>
          <span className="block text-sm text-gray-600">Unidad</span>
          <select
            name="unit"
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            defaultValue="u"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>

        <label className="col-span-2">
          <span className="block text-sm text-gray-600">Categoría (opcional)</span>
          <select
            name="category"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            defaultValue=""
          >
            <option value="">(sin categoría)</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex justify-end">
        <SubmitBtn />
      </div>
    </form>
  );
}
*/