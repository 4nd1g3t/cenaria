"use client";
import { generateMenuAction } from '@/app/menu/actions'
import { useFormStatus } from 'react-dom'
import '../style/menu.css' 

function LoadingOverlay() {
  const { pending } = useFormStatus()
  if (!pending) return null
  return (
    <div className="loadingOverlay">
      <div className="loadingSpinner"></div>
      <p>Generando menú…</p>
    </div>
  )
}

export default function MenuGeneratorForm() {
  return (
    <form action={generateMenuAction} className="form formNarrow">
      <div className="field">
        <label className="label">Personas</label>
        <input
          name="persons"
          type="number"
          min={1}
          max={12}
          defaultValue={2}
          className="input inlineNumber"
          required
        />
      </div>

      <fieldset className="field">
        <legend className="legend">Días</legend>
        <label className="choiceRow">
          <input type="radio" name="daysMode" value="weekdays" defaultChecked />
          <span>Lunes a viernes</span>
        </label>
        <label className="choiceRow">
          <input type="radio" name="daysMode" value="full_week" />
          <span>Semana completa</span>
        </label>
      </fieldset>

      <div className="field">
        <label className="label">Duración máx. (minutos) — opcional</label>
        <input
          name="maxDurationMin"
          type="number"
          min={10}
          max={180}
          placeholder="30"
          className="input inlineNumber"
        />
      </div>

      <label className="choiceRow">
        <input type="checkbox" name="usePantry" defaultChecked />
        <span>Usar despensa</span>
      </label>

      <div className="actions submitRow">
        <button type="submit" className="primary">Generar menú</button>
      </div>

      {/* Overlay bloqueante */}
      <LoadingOverlay />
    </form>
  )
}

