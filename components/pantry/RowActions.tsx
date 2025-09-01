'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { deleteItemAction, type ActionState } from '@/app/pantry/actions';
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
      className="primary"
      disabled={pending}
    >
      {pending ? 'Eliminando…' : 'Confirmar'}
    </button>
  );
}

export default function RowActions(props: Props) {
  const router = useRouter();

  const [openEdit, setOpenEdit] = React.useState(false);
  const [openDelete, setOpenDelete] = React.useState(false);

  const [localVersion, setLocalVersion] = React.useState<number | undefined>(
    typeof props.version === 'number' ? props.version : undefined
  );

  const initialDel: ActionState<DeleteData> = { ok: false };

  const deleteWrapped = React.useCallback(
    (prev: ActionState<DeleteData>, formData: FormData) =>
      deleteItemAction(prev as unknown as ActionState<unknown>, formData),
    []
  );

  const [delState, delAction] = React.useActionState<
    ActionState<DeleteData>,
    FormData
  >(deleteWrapped, initialDel);

  const handleUpdatedVersion = (v?: number) => {
    if (typeof v === 'number') setLocalVersion(v);
  };

  React.useEffect(() => {
    if (delState?.ok) {
      setOpenDelete(false);
      router.refresh();
    }
  }, [delState, router]);

  // Cerrar modal de eliminar con ESC
  React.useEffect(() => {
    if (!openDelete) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenDelete(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openDelete]);

  return (
    <div className="rowActions">
      <button
        type="button"
        className="addButtonSm"
        onClick={() => setOpenEdit(true)}
        aria-label={`Editar ${props.name}`}
      >
        Editar
      </button>

      <button
        type="button"
        className="dangerSoftBtn"
        onClick={() => setOpenDelete(true)}
        aria-label={`Eliminar ${props.name}`}
      >
        Eliminar
      </button>

      {/* EDITAR */}
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

      {/* ELIMINAR - Modal de confirmación */}
      {openDelete && (
        <div
          className="backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setOpenDelete(false); }}
        >
          <div
            className="modal modalSm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="del-title"
          >
            <div className="titleBar">
              <h2 id="del-title" className="titleDanger">Eliminar ingrediente</h2>
              <button
                className="iconClose"
                aria-label="Cerrar"
                onClick={() => setOpenDelete(false)}
              >
                ×
              </button>
            </div>

            <p className="confirmText">
              ¿Seguro que deseas eliminar <strong>{props.name}</strong>?
            </p>

            {delState?.error ? (
              <p className="confirmError">
                {delState.error.code === 'CONFLICT'
                  ? 'El ítem cambió/ya no existe. Refresca e intenta de nuevo.'
                  : delState.error.message || 'Error eliminando.'}
              </p>
            ) : null}

            <div className="actions">
              <button
                type="button"
                className="ghost"
                onClick={() => setOpenDelete(false)}
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
        </div>
      )}
    </div>
  );
}
