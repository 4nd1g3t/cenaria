import { replaceMenuRecipeAction } from '@/app/menu/[id]/actions';

type Props = {
  menuId: string;
  currentVersion?: number; // para If-Match opcional
};

export default async function ReplaceRecipeForm({ menuId, currentVersion }: Props) {
  // Server Component + server action => no "use client"
  const versionStr = typeof currentVersion === 'number' ? String(currentVersion) : '';

  return (
    <form action={replaceMenuRecipeAction} className="space-y-4 rounded-2xl p-4 shadow-sm border">
      <input type="hidden" name="id" value={menuId} />
      {versionStr ? <input type="hidden" name="ifMatch" value={versionStr} /> : null}

      <div className="grid gap-2">
        <label className="font-medium">Día</label>
        <select name="day" required className="border rounded-lg p-2">
          <option value="">Selecciona…</option>
          <option value="mon">Lunes</option>
          <option value="tue">Martes</option>
          <option value="wed">Miércoles</option>
          <option value="thu">Jueves</option>
          <option value="fri">Viernes</option>
          <option value="sat">Sábado</option>
          <option value="sun">Domingo</option>
        </select>
      </div>

      <div className="grid gap-2">
        <label className="font-medium">Personas (opcional)</label>
        <input name="persons" type="number" min={1} max={12} placeholder="ej. 2"
               className="border rounded-lg p-2" />
      </div>

      <div className="grid gap-2">
        <label className="font-medium">Duración máxima (min, opcional)</label>
        <input name="maxDurationMin" type="number" min={10} max={180} placeholder="ej. 30"
               className="border rounded-lg p-2" />
      </div>

      <div className="grid gap-2">
        <label className="font-medium">Evitar ingredientes (coma-separado)</label>
        <input name="avoidIngredients" type="text" placeholder="pescado, picante"
               className="border rounded-lg p-2" />
      </div>

      <div className="flex items-center gap-2">
        <input id="usePantry" name="usePantry" type="checkbox" defaultChecked className="h-4 w-4" />
        <label htmlFor="usePantry" className="font-medium">Usar Despensa</label>
      </div>

      <div className="pt-2">
        <button type="submit"
                className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90">
          Reemplazar receta
        </button>
      </div>

      {versionStr ? (
        <p className="text-xs text-gray-500">
          If-Match: <span className="font-mono">{versionStr}</span>
        </p>
      ) : (
        <p className="text-xs text-gray-500">
          (Sin If-Match) — Se enviará sin control OCC. Puedes pasar la versión actual para mayor seguridad.
        </p>
      )}
    </form>
  );
}
