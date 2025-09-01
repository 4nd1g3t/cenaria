"use client";

import { useMemo, useState, useCallback } from "react";
import RowActions from "./RowActions";
import { PantryItem } from "@/lib/types";

/** Normaliza la categoría para mapear a las clases .cat-* del CSS */
function getCategoryClass(cat?: string | null) {
  const raw = (cat || "otros")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // quita acentos

  const allowed = new Set([
    "verduras",
    "frutas",
    "carnes",
    "lacteos",
    "granos",
    "especias",
    "enlatados",
    "otros",
  ]);

  const key = allowed.has(raw) ? raw : "otros";
  return `categoryPill cat-${key}`;
}

type SortKey = "name" | "category";
type SortDir = "asc" | "desc";

export default function PantryList({ items }: { items: PantryItem[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null);

  const toggleSort = useCallback((key: SortKey) => {
    setSort((prev) =>
      prev?.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
  }, []);

  const sorted = useMemo(() => {
    if (!sort) return items;
    const copy = [...items];

    const normalize = (s: string) =>
      (s || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    copy.sort((a, b) => {
      const aKey =
        sort.key === "name"
          ? normalize(a.name)
          : normalize((a.category as string | undefined) || "otros");
      const bKey =
        sort.key === "name"
          ? normalize(b.name)
          : normalize((b.category as string | undefined) || "otros");

      const cmp = aKey.localeCompare(bKey, "es", { sensitivity: "base" });
      if (cmp !== 0) return sort.dir === "asc" ? cmp : -cmp;

      // Desempate por nombre
      const cmpName = normalize(a.name).localeCompare(normalize(b.name), "es", {
        sensitivity: "base",
      });
      return sort.dir === "asc" ? cmpName : -cmpName;
    });

    return copy;
  }, [items, sort]);

  if (!items?.length) {
    return (
      <div className="empty">
        <p>Sin elementos aún. Agrega tu primer ingrediente.</p>
      </div>
    );
  }

  const nameIcon = sort?.key === "name" ? (sort.dir === "asc" ? "▲" : "▼") : "↕";
  const catIcon  = sort?.key === "category" ? (sort.dir === "asc" ? "▲" : "▼") : "↕";

  const ariaSortFor = (key: SortKey) =>
    sort?.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none";

  return (
    <div className="tableWrap">
      <table className="table">
        <caption className="srOnly">Lista de ingredientes de la despensa</caption>
        <thead className="thead">
          <tr>
            <th aria-sort={ariaSortFor("name")}>
              <button
                type="button"
                className={`thButton ${sort?.key === "name" ? "thActive" : ""}`}
                onClick={() => toggleSort("name")}
                aria-label="Ordenar por nombre"
              >
                Nombre <span className="sortIcon" aria-hidden="true">{nameIcon}</span>
              </button>
            </th>

            <th>Cantidad</th>
            <th>Unidad</th>

            <th aria-sort={ariaSortFor("category")}>
              <button
                type="button"
                className={`thButton ${sort?.key === "category" ? "thActive" : ""}`}
                onClick={() => toggleSort("category")}
                aria-label="Ordenar por categoría"
              >
                Categoría <span className="sortIcon" aria-hidden="true">{catIcon}</span>
              </button>
            </th>

            <th aria-label="Acciones" />
          </tr>
        </thead>

        <tbody>
          {sorted.map((it) => (
            <tr key={it.id} className="row">
              <td className="cell" data-label="Nombre">
                {it.name}
              </td>
              <td className="cell" data-label="Cantidad">
                {it.quantity ?? ""}
              </td>
              <td className="cell" data-label="Unidad">
                {it.unit ?? ""}
              </td>
              <td className="cell" data-label="Categoría">
                {it.category ? (
                  <span className={getCategoryClass(it.category)}>{it.category}</span>
                ) : (
                  <span className={getCategoryClass(undefined)}>otros</span>
                )}
              </td>
              <td className="cell actionsCell" data-label="">
                <RowActions
                  id={it.id}
                  version={it.version}
                  name={it.name}
                  quantity={it.quantity}
                  unit={it.unit}
                  category={it.category}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
