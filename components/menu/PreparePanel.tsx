"use client";

import { useState } from "react";
import type { PrepareResponse } from "@/lib/menu";
import { prepareMenu } from "@/lib/menu";
import { Day } from "@/lib/units";
import React from "react";

export default function PreparePanel({ menuId }: { menuId: string }) {
  const [scope, setScope] = React.useState<"all"|"weekdays"|"days">("weekdays");
  const [days, setDays] = React.useState<Day[]>([]);
  const [result, setResult] = React.useState<PrepareResponse | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function simulate() {
    setLoading(true);
    try {
      const r = await prepareMenu(menuId, { scope, days: scope==="days" ? days : undefined, dryRun: true });
      setResult(r);
    } catch (e: any) { alert(e?.message || "Error en simulación"); }
    finally { setLoading(false); }
  }

  async function confirm() {
    setLoading(true);
    try {
      const r = await prepareMenu(menuId, { scope, days: scope==="days" ? days : undefined, dryRun: false });
      setResult(r);
      alert("¡Preparado! La despensa fue actualizada.");
    } catch (e: any) { alert(e?.message || "Error al preparar"); }
    finally { setLoading(false); }
  }

  return (
    <div className="border rounded p-4 space-y-3">
      <h2 className="font-semibold">Preparar menú</h2>
      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-sm">Alcance:</label>
        <select className="border rounded px-2 py-1" value={scope} onChange={e=>setScope(e.target.value as any)}>
          <option value="weekdays">Lun–Vie</option>
          <option value="all">Todos los días</option>
          <option value="days">Días específicos</option>
        </select>
        {scope==="days" && (
          <input className="border rounded px-2 py-1"
            placeholder="Ej: mon,wed,fri"
            onChange={(e)=>{
              const tokens = e.target.value.split(",").map(s=>s.trim()).filter(Boolean) as Day[];
              setDays(tokens);
            }}
          />
        )}
        <button className="border rounded px-3 py-2" disabled={loading} onClick={simulate}>
          {loading ? "..." : "Simular (dryRun)"}
        </button>
        <button className="bg-black text-white rounded px-3 py-2" disabled={loading || !result} onClick={confirm}>
          Confirmar y descontar
        </button>
      </div>

      {result && (
        <div className="mt-3">
          <h3 className="font-medium">Resultado</h3>
          {result.shortages.length === 0 ? (
            <p className="text-sm text-green-700">Sin faltantes 👍</p>
          ) : (
            <div className="text-sm">
              <p className="mb-1">Faltantes:</p>
              <ul className="list-disc pl-5">
                {result.shortages.map((s, i)=>(
                  <li key={i}>
                    <b>{s.name}</b> — falta {s.missing.quantity}{s.missing.unit} ({s.reason})
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.pantryUpdates?.length ? (
            <div className="text-sm mt-2">
              <p className="mb-1">Cambios en despensa:</p>
              <ul className="list-disc pl-5">
                {result.pantryUpdates.map((u,i)=>(
                  <li key={i}>
                    {u.name}: {u.from.quantity}{u.from.unit} → {u.to.quantity}{u.to.unit} ({u.action})
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
