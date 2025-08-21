'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import {
  deleteItemAction,
  type ActionState,
} from '@/app/pantry/actions';
import EditPantryItemDialog from './EditPantryItemDialog';

type Props = {
  id: string;
  version?: number | null;
  name: string;
  quantity: number;
  unit: string;
  category?: string | null;
};

type DeleteData = { id: string };

function DeleteSubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      disabled={pending}
    >
      {pending ? 'Eliminando…' : 'Confirmar'}
    </button>
  );
}

export default function RowActions(props: Props) {
  const router = useRouter();

  const [openEdit, setOpenEdit] = React.useState(false);
  const [localVersion, setLocalVersion] = React.useState<number | undefined>(
    typeof props.version === 'number' ? props.version : undefined
  );

  const initialDel: ActionState<DeleteData> = { ok: false };
  const [delState, delAction] = useFormState(deleteItemAction, initialDel);

  const handleUpdatedVersion = (v?: number) => {
    if (typeof v === 'number') setLocalVersion(v);
  };

  React.useEffect(() => {
    if (delState?.ok) {
      router.refresh();
    }
  }, [delState, router]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="rounded-md border px-2 py-1 text-sm text-gray-700 hover:bg-gray-50"
        onClick={() => setOpenEdit(true)}
      >
        Editar
      </button>

      <details className="relative">
        <summary className="list-none">
          <button
            type="button"
            className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-sm text-red-700 hover:bg-red-100"
          >
            Eliminar
          </button>
        </summary>
        <div className="absolute right-0 mt-2 w-64 rounded-xl border bg-white p-3 shadow-lg">
          <p className="text-sm text-gray-700">
            ¿Seguro que deseas eliminar <span className="font-medium">{props.name}</span>?
          </p>
          {delState?.error ? (
            <p
              className={`mt-2 text-xs ${
                delState.error.code === 'CONFLICT' ? 'text-amber-600' : 'text-red-600'
              }`}
            >
              {delState.error.code === 'CONFLICT'
                ? 'El ítem cambió/ya no existe. Refresca e intenta de nuevo.'
                : delState.error.message || 'Error eliminando.'}
            </p>
          ) : null}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md border px-3 py-1 text-sm"
              onClick={(e) => {
                const details = (e.currentTarget.closest('details') as HTMLDetailsElement) || null;
                if (details) details.open = false;
              }}
            >
              Cancelar
            </button>

            <form action={delAction}>
              <input type="hidden" name="id" value={props.id} />
              {typeof localVersion === 'number' ? (
                <input type="hidden" name="version" value={String(localVersion)} />
              ) : null}
              <DeleteSubmitBtn />
            </form>
          </div>
        </div>
      </details>

      <EditPantryItemDialog
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        item={{
          id: props.id,
          version: localVersion,
          name: props.name,
          quantity: props.quantity,
          unit: props.unit,
          category: props.category ?? undefined,
        }}
        onUpdatedVersion={handleUpdatedVersion}
      />
    </div>
  );
}
