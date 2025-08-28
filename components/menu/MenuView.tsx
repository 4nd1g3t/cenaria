// No 'use client' aquí. Este componente no hace llamadas; solo renderiza y
// dispara server actions vía <form action={...}>

import { prepareMenuAction, finalizeMenuAction } from '@/app/menu/[id]/actions'

type Props = { menu: any }

const DAYS: Array<{ key: string; label: string }> = [
  { key: 'mon', label: 'Lunes' },
  { key: 'tue', label: 'Martes' },
  { key: 'wed', label: 'Miércoles' },
  { key: 'thu', label: 'Jueves' },
  { key: 'fri', label: 'Viernes' },
  { key: 'sat', label: 'Sábado' },
  { key: 'sun', label: 'Domingo' },
]

export default function MenuView({ menu }: Props) {
  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Menú semanal</h1>
          <p className="text-sm text-gray-500">
            Personas: {menu?.persons ?? 2} · Estado: {menu?.status ?? 'draft'}
          </p>
        </div>

        {/* Finalizar menú */}
        <form action={finalizeMenuAction.bind(null, menu.id, menu.version)}>
          <button
            type="submit"
            className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
            disabled={menu?.status === 'final'}
          >
            {menu?.status === 'final' ? 'Finalizado' : 'Finalizar'}
          </button>
        </form>
      </header>

      {/* Días y recetas */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DAYS.map(({ key, label }) => {
          const r = menu?.days?.[key]
          return (
            <div key={key} className="rounded border p-4">
              <h3 className="font-medium">{label}</h3>
              {r ? (
                <div className="mt-2 space-y-1">
                  <div className="font-semibold">{r.title}</div>
                  <div className="text-sm text-gray-600">
                    {r.durationMin ?? '-'} min · {r.servings ?? menu?.persons ?? 2} porciones
                  </div>
                  <ul className="list-disc pl-5 text-sm">
                    {r.ingredients?.map((ing: any, i: number) => (
                      <li key={i}>
                        {ing.name}: {ing.quantity} {ing.unit}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-gray-500 mt-2">— Sin receta asignada —</p>
              )}
            </div>
          )
        })}
      </section>

      {/* Preparar menú (descontar despensa o simular) */}
      <section className="rounded border p-4">
        <h2 className="font-semibold mb-2">Preparar</h2>
        <form action={prepareMenuAction.bind(null, menu.id)} className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              <input type="radio" name="scope" value="all" defaultChecked />
              Toda la semana
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="scope" value="weekdays" />
              Lunes a viernes
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="scope" value="days" />
              Días específicos
            </label>
          </div>

          {/* Días específicos opcionales (enviar multiple days[]) */}
          <div className="flex flex-wrap gap-2">
            {DAYS.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="days" value={key} />
                {label}
              </label>
            ))}
          </div>

          <label className="flex items-center gap-2">
            <input type="checkbox" name="dryRun" defaultChecked />
            Simular (no descontar despensa)
          </label>

          <div>
            <button type="submit" className="rounded bg-black text-white px-4 py-2">
              Ejecutar
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
