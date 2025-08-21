// src/components/pantry/PantryList.tsx
import RowActions from "./RowActions";
import type { PantryItem } from "@/lib/pantry";

export default function PantryList({ items }: { items: PantryItem[] }) {
  if (!items?.length) return <p className="text-sm text-gray-500">Sin elementos aún.</p>;
  return (
    <table className="w-full border-separate border-spacing-y-2">
      <thead>
        <tr className="text-left text-sm text-gray-600">
          <th className="px-2">Nombre</th>
          <th className="px-2">Cantidad</th>
          <th className="px-2">Unidad</th>
          <th className="px-2">Categoria</th>
          <th className="px-2"/>
        </tr>
      </thead>
      <tbody>
        {items.map((it) => (
          <tr key={it.id} className="bg-white shadow-sm">
            <td className="px-2 py-2">{it.name}</td>
            <td className="px-2 py-2">{it.quantity ?? ""}</td>
            <td className="px-2 py-2">{it.unit ?? ""}</td>
            <td className="px-2 py-2">{it.category ?? ""}</td>
            <td className="px-2 py-2">
              <RowActions id={it.id} version={it.version} name={it.name} quantity={it.quantity} unit={it.unit} category={it.category} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}