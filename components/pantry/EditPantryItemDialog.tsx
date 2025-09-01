'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { updateItemAction, type ActionState, type UpdatePayload } from '@/app/pantry/actions';
import { CATEGORIES, UNITS } from '@/lib/units';

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

function SaveBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="primary" disabled={pending}>
      {pending ? 'Guardando cambios…' : 'Guardar'}
    </button>
  );
}

export default function EditPantryItemDialog({ open, onClose, item, onUpdatedVersion }: Props) {
  const router = useRouter();
  const [localVersion, setLocalVersion] = React.useState<number | undefined>(
    typeof item.version === 'number' ? item.version : undefined
  );
  const nameInputRef = React.useRef<HTMLInputElement | null>(null);

  // cantidad con stepper ±
  const [qty, setQty] = React.useState<number>(item.quantity ?? 0);
  React.useEffect(() => {
    if (open) setQty(item.quantity ?? 0);
  }, [open, item.quantity]);

  const dec = () => setQty((v) => Math.max(0, (Number.isFinite(v) ? v : 0) - 1));
  const inc = () => setQty((v) => Math.max(0, (Number.isFinite(v) ? v : 0) + 1));
  const onQtyInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = Number(e.target.value);
    setQty(Number.isFinite(n) ? Math.max(0, n) : 0);
  };

  const initialState: ActionState<UpdatePayload> = { ok: false };
  const [state, formAction] = React.useActionState<ActionState<UpdatePayload>, FormData>(
    updateItemAction,
    initialState
  );

  // Cierre con ESC y focus al abrir
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    nameInputRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  React.useEffect(() => {
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
    <div
      className="backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-pantry-title"
        className="modal"
      >
        <div className="titleBar">
          <h2 id="edit-pantry-title">Editar ingrediente</h2>
          <button className="iconClose" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>

        <form action={formAction} className="form">
          <input type="hidden" name="id" value={item.id} />
          {typeof localVersion === 'number' ? (
            <input type="hidden" name="version" value={String(localVersion)} />
          ) : null}

          <div className="grid">
            <label className="full">
              <span className="label">Nombre</span>
              <input
                ref={nameInputRef}
                name="name"
                required
                minLength={2}
                defaultValue={item.name}
                className="input"
                placeholder="ej. Arroz"
              />
            </label>

            <label>
              <span className="label">Cantidad</span>
              <div className="qtyGroup">
                <button
                  type="button"
                  className="stepperBtn stepperBtnMinus"
                  onClick={dec}
                  aria-label="Disminuir cantidad"
                >
                  −
                </button>

                <input
                  name="quantity"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={0}
                  value={qty}
                  onChange={onQtyInput}
                  className="input stepperInput"
                  placeholder="0"
                />

                <button
                  type="button"
                  className="stepperBtn stepperBtnPlus"
                  onClick={inc}
                  aria-label="Aumentar cantidad"
                >
                  +
                </button>
              </div>
            </label>

            <label>
              <span className="label">Unidad</span>
              <select
                name="unit"
                defaultValue={item.unit}
                className="input"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </label>

            <label className="full">
              <span className="label">Categoría (opcional)</span>
              <select
                name="category"
                defaultValue={item.category || ''}
                className="input"
              >
                <option value="">(sin categoría)</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>

          {hasError ? (
            <p className="confirmError">
              {isConflict
                ? 'El ítem cambió en el servidor. Refresca la lista e intenta de nuevo.'
                : state?.error?.message || 'Ocurrió un error.'}
            </p>
          ) : null}

          <div className="actions">
            <button type="button" className="ghost" onClick={onClose}>
              Cancelar
            </button>
            <SaveBtn />
          </div>
        </form>
      </div>
    </div>
  );
}
