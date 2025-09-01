"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createItemActionVoid } from "@/app/pantry/actions";
import { UNITS, CATEGORIES } from "@/lib/units";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="primary" disabled={pending}>
      {pending ? "Agregando…" : "Agregar"}
    </button>
  );
}

export default function PantryForm() {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState<number>(0);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // Cerrar con Escape y focus al abrir
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    nameInputRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const dec = () => setQty((v) => Math.max(0, (Number.isFinite(v) ? v : 0) - 1));
  const inc = () => setQty((v) => Math.max(0, (Number.isFinite(v) ? v : 0) + 1));
  const onQtyInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = Number(e.target.value);
    setQty(Number.isFinite(n) ? Math.max(0, n) : 0);
  };

  return (
    <>
      <button className="addButton" onClick={() => setOpen(true)}>
        + Agregar ingrediente
      </button>

      {open && (
        <div
          className="backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pantry-add-title"
          >
            <div className="titleBar">
              <h2 id="pantry-add-title">Agregar ingrediente</h2>
              <button className="iconClose" aria-label="Cerrar" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>

            <form action={createItemActionVoid} className="form">
              <div className="grid">
                <label className="full">
                  <span className="label">Nombre</span>
                  <input
                    ref={nameInputRef}
                    name="name"
                    required
                    minLength={2}
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
                  <select name="unit" required className="input" defaultValue="u">
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="full">
                  <span className="label">Categoría (opcional)</span>
                  <select name="category" className="input" defaultValue="">
                    <option value="">(sin categoría)</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="actions">
                <button type="button" className="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </button>
                <SubmitBtn />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
