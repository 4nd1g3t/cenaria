"use client";

import React, { useMemo, useState } from 'react';
import { type Day } from '@/lib/units';
import { ApiStatusError } from '@/lib/constants';

// --- Types (aligned with backend contract) ---
export type PrepareScope = 'all'|'weekdays'|'days';

export interface Shortage {
  name: string;
  required: { quantity: number; unit: string };
  available?: { quantity: number; unit: string };
  missing: { quantity: number; unit: string };
  reason: 'unit_mismatch'|'not_found'|'insufficient';
}

export interface PantryUpdate {
  id: string;
  name: string;
  action: 'update'|'delete';
  from: { quantity: number; unit: string };
  to?: { quantity: number; unit: string };
}

export interface WeeklyMenu {
  id: string;
  version: number;
  status: 'draft'|'final';
  prepared?: Array<{ at: number; scope: PrepareScope; days?: Day[]; dryRun: boolean }>
}

export interface PrepareMenuResponse {
  prepared: boolean;
  scope: PrepareScope;
  days?: Day[];
  appliedDays: Day[];
  alreadyPreparedDays: Day[];
  shortages: Shortage[];
  pantryUpdates: PantryUpdate[];
  menu: WeeklyMenu;
}

// --- Props ---
interface PreparePanelProps {
  menuId: string;
  idToken: string; // Cognito ID token for JWT Authorizer
  apiUrl: string;  // e.g. https://y3sh6vq335.execute-api.us-east-2.amazonaws.com/dev/v1
  onAfterConfirm?: (resp: PrepareMenuResponse) => void; // to refresh pantry/menu outside
}

// --- Helpers ---
const DAYS: { key: Day; label: string }[] = [
  { key: 'mon', label: 'Lun' },
  { key: 'tue', label: 'Mar' },
  { key: 'wed', label: 'Mié' },
  { key: 'thu', label: 'Jue' },
  { key: 'fri', label: 'Vie' },
  { key: 'sat', label: 'Sáb' },
  { key: 'sun', label: 'Dom' },
];

function classNames(...s: (string|false|undefined)[]) { return s.filter(Boolean).join(' '); }

async function callPrepare({ apiUrl, idToken, menuId, scope, days, dryRun }:
  { apiUrl: string; idToken: string; menuId: string; scope: PrepareScope; days?: Day[]; dryRun?: boolean }) {
  const r = await fetch(`${apiUrl}/v1/menu/${menuId}/prepare`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ scope, days, dryRun: !!dryRun })
  });
  if (!r.ok) {
    let details: ApiStatusError | undefined;
    try { details = await r.json() as ApiStatusError; } catch {}
    throw new Error(details?.message || `Error ${r.status}`);
  }
  const j = await r.json();
  return j as PrepareMenuResponse;
}

// --- Component ---
export default function PreparePanel({ menuId, idToken, apiUrl, onAfterConfirm }: PreparePanelProps) {
  const [scope, setScope] = useState<PrepareScope>('all');
  const [selectedDays, setSelectedDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState<'simulate'|'confirm'|null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PrepareMenuResponse | null>(null);

  const canPickDays = scope === 'days';
  const canConfirm = useMemo(() => {
    if (!result) return false;
    return result.appliedDays.length > 0; // confirm only if there are pending days
  }, [result]);

  const run = async (dryRun: boolean) => {
    setError(null);
    setLoading(dryRun ? 'simulate' : 'confirm');
    try {
      const resp = await callPrepare({ apiUrl, idToken, menuId, scope, days: canPickDays ? selectedDays : undefined, dryRun });
      setResult(resp);
      if (!dryRun) onAfterConfirm?.(resp);
    } catch (e: unknown) {
        if (e instanceof Error) setError(e.message);
        else setError('Error Desconocido');
    } finally {
      setLoading(null);
    }
  };

  const toggleDay = (d: Day) => {
    setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Preparar menú ↔ Despensa</h3>
        <span className="text-xs text-gray-500">menuId: {menuId}</span>
      </div>

      {/* Scope selector */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="col-span-2">
          <label className="mb-1 block text-sm font-medium">Alcance</label>
          <div className="flex gap-2">
            {(['all','weekdays','days'] as PrepareScope[]).map(s => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={classNames(
                  'rounded-xl border px-3 py-2 text-sm transition',
                  scope === s ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 hover:bg-gray-50'
                )}
              >
                {s === 'all' ? 'Semana completa' : s === 'weekdays' ? 'Lun–Vie' : 'Días específicos'}
              </button>
            ))}
          </div>
        </div>

        {/* Day picker */}
        <div className={classNames('col-span-2', !canPickDays && 'opacity-50')}> 
          <label className="mb-1 block text-sm font-medium">Días</label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map(d => (
              <button
                key={d.key}
                disabled={!canPickDays}
                onClick={() => toggleDay(d.key)}
                className={classNames(
                  'rounded-xl border px-3 py-2 text-sm',
                  selectedDays.includes(d.key) ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 hover:bg-gray-50',
                  !canPickDays && 'cursor-not-allowed'
                )}
              >{d.label}</button>
            ))}
          </div>
          {canPickDays && selectedDays.length === 0 && (
            <p className="mt-1 text-xs text-gray-500">Selecciona al menos un día.</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={() => run(true)}
          disabled={loading !== null || (canPickDays && selectedDays.length === 0)}
          className={classNames('rounded-2xl px-4 py-2 text-sm shadow',
            'border border-gray-300 bg-white hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60')}
        >{loading === 'simulate' ? 'Simulando…' : 'Simular'}</button>

        <button
          onClick={() => run(false)}
          disabled={loading !== null || !canConfirm}
          className={classNames('rounded-2xl px-4 py-2 text-sm shadow',
            canConfirm ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed')}
        >{loading === 'confirm' ? 'Confirmando…' : 'Confirmar'}</button>

        {result && (
          <span className="text-xs text-gray-500">v{result.menu?.version ?? '-'} • {result.prepared ? 'Aplicado' : 'Simulación'}</span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 p-4">
            <h4 className="mb-2 text-sm font-semibold">Días</h4>
            <div className="flex flex-wrap gap-2 text-xs">
              <BadgeList title="Aplicados" items={result.appliedDays} color="emerald" />
              <BadgeList title="Ya preparados" items={result.alreadyPreparedDays} color="amber" />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 p-4">
            <h4 className="mb-2 text-sm font-semibold">Cambios en despensa</h4>
            {result.pantryUpdates.length === 0 ? (
              <p className="text-sm text-gray-500">Sin cambios.</p>
            ) : (
              <ul className="space-y-2">
                {result.pantryUpdates.map((u, i) => (
                  <li key={i} className="rounded-xl border border-gray-100 p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{u.name}</span>
                      <span className={classNames('rounded-full px-2 py-0.5 text-xs',
                        u.action === 'delete' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700')}>{u.action}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-600">{u.from.quantity} {u.from.unit} → {u.to ? `${u.to.quantity} ${u.to.unit}` : '0'}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 p-4 md:col-span-2">
            <h4 className="mb-2 text-sm font-semibold">Faltantes</h4>
            {result.shortages.length === 0 ? (
              <p className="text-sm text-gray-500">No hay faltantes 🎉</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-gray-500">
                    <th className="py-1">Ingrediente</th>
                    <th className="py-1">Requerido</th>
                    <th className="py-1">Disponible</th>
                    <th className="py-1">Falta</th>
                    <th className="py-1">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {result.shortages.map((s, i) => (
                    <tr key={i} className="border-t">
                      <td className="py-2 font-medium">{s.name}</td>
                      <td className="py-2">{s.required.quantity} {s.required.unit}</td>
                      <td className="py-2">{s.available ? `${s.available.quantity} ${s.available.unit}` : '—'}</td>
                      <td className="py-2">{s.missing.quantity} {s.missing.unit}</td>
                      <td className="py-2">
                        <span className={classNames('rounded-full px-2 py-0.5 text-xs',
                          s.reason === 'not_found' ? 'bg-gray-100 text-gray-700'
                          : s.reason === 'unit_mismatch' ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-700')}>{s.reason}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- UI smalls ---
function BadgeList({ title, items, color }:{ title: string; items: Day[]; color: 'emerald'|'amber'}) {
  const palette = color === 'emerald'
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-amber-100 text-amber-800';
  return (
    <div className="min-w-[220px]">
      <div className="mb-1 text-xs font-medium text-gray-600">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.length === 0 ? <span className="text-xs text-gray-400">—</span> :
          items.map((d, i) => (
            <span key={i} className={classNames('rounded-full px-2 py-0.5 text-[11px]', palette)}>
              {dayLabel(d)}
            </span>
          ))}
      </div>
    </div>
  );
}

function dayLabel(d: Day) {
  switch (d) {
    case 'mon': return 'Lun';
    case 'tue': return 'Mar';
    case 'wed': return 'Mié';
    case 'thu': return 'Jue';
    case 'fri': return 'Vie';
    case 'sat': return 'Sáb';
    case 'sun': return 'Dom';
  }
}
