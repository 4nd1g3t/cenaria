// components/pantry/RowActions.tsx
"use client";
import { useTransition } from "react";
import { deleteActionVoid, updateActionVoid } from "@/app/despensa/actions"; // si usas wrappers void
// o: import { deleteAction, updateAction } ...

export default function RowActions({
  id,
  version,
  name,
  quantity,
  unit,
}: {
  id: string;
  version?: number;        // ✅ reemplaza etag por version
  name: string;
  quantity: number;
  unit: string;
}) {
  const [pending, start] = useTransition();

  function onDelete() {
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      if (typeof version === "number") fd.set("version", String(version)); // ✅
      await deleteActionVoid(fd); // o deleteAction(fd)
    });
  }

  function onEdit() {
    const newName = prompt("Nombre", name) ?? name;
    const newQtyStr = prompt("Cantidad", quantity.toString());
    const newQty = newQtyStr ? Number(newQtyStr) : quantity;
    const newUnit = prompt("Unidad", unit) ?? unit;

    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      if (typeof version === "number") fd.set("version", String(version)); // ✅
      if (newName !== name) fd.set("name", newName);
      if (!Number.isNaN(newQty) && newQty !== quantity) fd.set("quantity", String(newQty));
      if (newUnit !== unit) fd.set("unit", newUnit);
      await updateActionVoid(fd); // o updateAction(fd)
    });
  }

  return (
    <div className="flex gap-2">
      <button onClick={onEdit} disabled={pending} className="px-2 py-1 border rounded">Editar</button>
      <button onClick={onDelete} disabled={pending} className="px-2 py-1 border rounded">Borrar</button>
    </div>
  );
}
