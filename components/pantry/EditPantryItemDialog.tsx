'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import { updateItemAction, type ActionState, type UpdatePayload } from '@/app/despensa/actions';

type Props = {
  open: boolean;
  onClose: () => void;
  item: {
    id: string;
    version?: number | null;
    name: string;
    quantity: number;
    unit: string;
    category?: string | null;
  };
  onUpdatedVersion?: (newVersion?: number) => void;
};

const UNITS = ['g', 'kg', 'ml', 'l', 'u', 'tbsp', 'tsp', 'cup', 'pack', 'other'] as const;
const CATEGORIES = [
  'verduras',
  'frutas',
  'carnes',
  'lácteos',
  'granos',
  'especias',
  'enlatados',
  'otros',
] as const;

function SaveBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      disabled={pending}
    >
      {pending ? 'Guardando cambios…' : 'Guardar'}
    </button>
  );
}

export default function EditPantryItemDialog({ open, onClose, item, onUpdatedVersion }: Props) {
  const router = useRouter();
  const [localVersion, setLocalVersion] = useState<number | undefined>(
    typeof item.version === 'number' ? item.version : undefined
  );

  const initialState: ActionState<UpdatePayload> = { ok: false };
  const [state, formAction] = useFormState(updateItemAction, initialState);

  useEffect(() => {
    if (state?.ok && state.data) {
      const newVersion = state.data.version;
      if (typeof newVersion === 'number') {
        setLocalVersion(newVersion);
        onUpdatedVersion?.(newVersion);
      }
      onClose();
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!open) return null;

  const hasError = !!state?.error;
  const isConflict = state?.error?.code === 'CONFLICT';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => onClose()}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold mb-4">Editar ítem</h2>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={item.id} />
          {typeof localVersion === 'number' ? (
            <input type="hidden" name="version" value={String(localVersion)} />
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <label className="col-span-2">
              <span className="block text-sm text-gray-600">Nombre</span>
              <input
                name="name"
                required
                minLength={2}
                defaultValue={item.name}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>

            <label>
              <span className="block text-sm text-gray-600">Cantidad</span>
              <input
                name="quantity"
                type="number"
                step="any"
                min={0}
                defaultValue={item.quantity}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>

            <label>
              <span className="block text-sm text-gray-600">Unidad</span>
              <select
                name="unit"
                defaultValue={item.unit}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
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
                defaultValue={item.category || ''}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
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

          {hasError ? (
            <p className={`text-sm ${isConflict ? 'text-amber-600' : 'text-red-600'}`}>
              {isConflict
                ? 'El ítem cambió en el servidor. Refresca la lista e intenta de nuevo.'
                : state?.error?.message || 'Ocurrió un error.'}
            </p>
          ) : null}

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border px-4 py-2 text-gray-700"
              onClick={onClose}
            >
              Cancelar
            </button>
            <SaveBtn />
          </div>
        </form>
      </div>
    </div>
  );
}
