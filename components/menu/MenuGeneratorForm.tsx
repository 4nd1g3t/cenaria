// NOTA: no pongas 'use client'. Este componente no usa React en el cliente.
// Es solo HTML/JSX que postea a una server action.

import { generateMenuAction } from '@/app/menu/actions'

export default function MenuGeneratorForm() {
  return (
    <form action={generateMenuAction} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Personas</label>
        <input
          name="persons"
          type="number"
          min={1}
          max={12}
          defaultValue={2}
          className="w-28 rounded border px-2 py-1"
          required
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Días</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="daysMode" value="full_week" defaultChecked /> Semana completa
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="daysMode" value="weekdays" /> Lunes a viernes
        </label>
      </fieldset>

      <div>
        <label className="block text-sm font-medium mb-1">Duración máx. (minutos) — opcional</label>
        <input
          name="maxDurationMin"
          type="number"
          min={10}
          max={180}
          placeholder="30"
          className="w-32 rounded border px-2 py-1"
        />
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" name="usePantry" defaultChecked /> Usar despensa
      </label>

      <div className="pt-2">
        <button
          type="submit"
          className="rounded bg-black text-white px-4 py-2"
        >
          Generar menú
        </button>
      </div>
    </form>
  )
}
