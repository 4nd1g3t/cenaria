"use client";

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
