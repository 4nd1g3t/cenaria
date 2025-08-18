// components/pantry/PantryForm.tsx
"use client";
import { useFormStatus } from "react-dom";
import { createActionVoid } from "@/app/despensa/actions";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-2xl px-4 py-2 border shadow">
      {pending ? "Guardando…" : "Agregar"}
    </button>
  );
}

export default function PantryForm() {
  return (
    <form action={createActionVoid} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
      <label className="block">
        <span className="text-sm">Nombre</span>
        <input name="name" required className="w-full border rounded px-3 py-2" />
      </label>
      <label className="block">
        <span className="text-sm">Cantidad</span>
        <input name="quantity" type="number" step="any" min={0} required className="w-full border rounded px-3 py-2" />
      </label>
      <label className="block">
        <span className="text-sm">Unidad</span>
        <select name="unit" required className="w-full border rounded px-3 py-2">
          <option value="">—</option>
          <option value="g">g</option>
          <option value="kg">kg</option>
          <option value="ml">ml</option>
          <option value="l">l</option>
          <option value="u">u</option>
          <option value="tbsp">tbsp</option>
          <option value="tsp">tsp</option>
          <option value="cup">cup</option>
          <option value="pack">pack</option>
          <option value="other">other</option>
        </select>
      </label>
      <label className="block">
        <span className="text-sm">Categoría</span>
        <input name="category" className="w-full border rounded px-3 py-2" />
      </label>
      <SubmitBtn />
    </form>
  );
}
