// Server Component (sin 'use client')
import '../style/menu.css';
import { prepareMenuAction, finalizeMenuAction, replaceMenuRecipeAction } from '@/app/menu/[id]/actions';

type Shortage = {
  name: string;
  required: { quantity: number; unit: string };
  available?: { quantity: number; unit: string };
  missing: { quantity: number; unit: string };
  reason: 'unit_mismatch' | 'not_found' | 'insufficient';
};

type Simulation = {
  day: string;                   // 'mon' | 'tue' ...
  shortages: Shortage[];
  available?: Array<{ name: string; quantity: number; unit: string }>;
};

type Props = {
  menu: any;
  simulation?: Simulation | null; // <-- opcional: pásalo desde la action de prepare (dryRun)
};

const DAYS: Array<{ key: string; label: string }> = [
  { key: 'mon', label: 'Lunes' },
  { key: 'tue', label: 'Martes' },
  { key: 'wed', label: 'Miércoles' },
  { key: 'thu', label: 'Jueves' },
  { key: 'fri', label: 'Viernes' },
  { key: 'sat', label: 'Sábado' },
  { key: 'sun', label: 'Domingo' },
];

export default function MenuView({ menu, simulation }: Props) {
  return (
    <div className="menuContainer">
      {/* Header */}
      <header className="menuHeader">
        <div className="menuHeaderLeft">
          <h1 className="menuTitle">Menú semanal</h1>
          <p className="menuSubtitle">
            Personas: {menu?.persons ?? 2} · Estado: {menu?.status ?? 'draft'}
          </p>
        </div>

        {/* Finalizar menú */}
        <form className="menuFinalizeForm" action={finalizeMenuAction.bind(null, menu.id, menu.version)}>
          <button
            type="submit"
            className="btnPrimary"
            disabled={menu?.status === 'final'}
            aria-disabled={menu?.status === 'final'}
          >
            {menu?.status === 'final' ? 'Finalizado' : 'Finalizar'}
          </button>
        </form>
      </header>

      {/* Días y recetas */}
      <section className="menuDaysGrid">
        {DAYS.map(({ key, label }) => {
          const r = menu?.days?.[key];
          const isSimulatedDay = simulation?.day === key;

          return (
            <article key={key} className="menuDayCard">
              <div className="menuDayHead">
                <h3 className="menuDayTitle">{label}</h3>

                {/* Acciones por día */}
                <div className="dayActions">
                  {/* Simular (dryRun) */}
                  <form
                    action={prepareMenuAction.bind(null, menu.id)}
                    className="inlineForm"
                  >
                    <input type="hidden" name="scope" value="days" />
                    <input type="hidden" name="days" value={key} />
                    <input type="hidden" name="dryRun" value="true" />
                    {/* hint para que el server sepa mostrar modal de este día */}
                    <input type="hidden" name="showDay" value={key} />
                    <button type="submit" className="btnGhost">Simular</button>
                  </form>

                  {/* Volver a generar SOLO este día */}
                  <form 
                    action={replaceMenuRecipeAction} 
                    className="inlineForm"
                  >
                    <input type="hidden" name="id" value={menu.id} />
                    <input type="hidden" name="day" value={key} />
                    <button type="submit" className="btnGhost">Volver a generar</button>
                  </form>
                </div>
              </div>

              {/* Contenido receta */}
              {r ? (
                <div className="menuRecipe">
                  <div className="menuRecipeTitle">{r.title}</div>
                  <div className="menuRecipeMeta">
                    {r.durationMin ?? '-'} min · {r.servings ?? menu?.persons ?? 2} porciones
                  </div>
                  <ul className="menuIngList">
                    {r.ingredients?.map((ing: any, i: number) => (
                      <li key={i} className="menuIngItem">
                        <span className="menuIngName">{ing.name}</span>: {ing.quantity} {ing.unit}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="menuEmptyDay">— Sin receta asignada —</p>
              )}

              {/* Modal de simulación (solo si simulation && day coincide) */}
              {isSimulatedDay && (
                <div className="modalBackdrop">
                  <div className="modalCard modalMd">
                    <div className="modalTitleBar">
                      <h4>Simulación — {label}</h4>
                      {/* Botón cerrar: vuelve a la misma página sin estado de simulación */}
                      <form method="GET" className="inlineForm">
                        <button className="iconClose" aria-label="Cerrar">×</button>
                      </form>
                    </div>

                    <div className="modalBody">
                      {/* Disponibles (si llega el arreglo); si no, lo omitimos */}
                      {simulation?.available && simulation.available.length > 0 && (
                        <section className="simBlock">
                          <h5 className="simHeading ok">Disponibles en despensa</h5>
                          <ul className="simList">
                            {simulation.available.map((a, idx) => (
                              <li key={idx} className="simItem">
                                <span className="ingName">{a.name}</span>
                                <span className="ingQty">{a.quantity} {a.unit}</span>
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}

                      {/* Faltantes */}
                      <section className="simBlock">
                        <h5 className="simHeading warn">Faltantes</h5>
                        {simulation?.shortages?.length ? (
                          <ul className="simList">
                            {simulation.shortages.map((s, idx) => (
                              <li key={idx} className="simItem shortage">
                                <span className="ingName">{s.name}</span>
                                <span className="ingQty">
                                  falta {s.missing.quantity} {s.missing.unit}
                                  {s.reason === 'unit_mismatch' ? ' (unidad incompatible)' :
                                   s.reason === 'insufficient' ? ' (insuficiente)' :
                                   ' (no encontrado)'}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="simEmpty">Sin faltantes 🎉</p>
                        )}
                      </section>
                    </div>

                    <div className="modalActions">
                      {/* CTA ir a Despensa o cerrar */}
                      <a href="/pantry" className="btnGhost">Ver en Despensa</a>
                      <form method="GET" className="inlineForm">
                        <button className="primary">Cerrar</button>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
