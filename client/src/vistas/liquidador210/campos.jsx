function formatearPesos(valor) {
  if (!valor) return '';
  // Redondeo SOLO de presentación (Math.round, no redondearMiles) — algunos
  // valores de solo lectura vienen sin redondear desde el motor a propósito
  // (ver cedulas/trabajo.js), pero en pesos no se muestran centavos.
  return Math.round(Number(valor)).toLocaleString('es-CO');
}

function limpiarPesos(texto) {
  const numero = Number(String(texto).replace(/[^\d-]/g, ''));
  return Number.isFinite(numero) ? numero : 0;
}

/**
 * @param {boolean} [soloLectura] Para valores que el motor calcula solo
 *   (ej. auxilio de cesantía exento, renta exenta 25% laboral) — se
 *   muestran junto a los campos digitables pero no se pueden editar.
 */
export function CampoDinero({ etiqueta, nota, valor, onCambiar, soloLectura }) {
  return (
    <label className="campo-dinero">
      <span>
        {etiqueta}
        {nota && <span className="tenue"> — {nota}</span>}
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={formatearPesos(valor)}
        placeholder="0"
        disabled={soloLectura}
        onChange={(e) => onCambiar && onCambiar(limpiarPesos(e.target.value))}
      />
    </label>
  );
}

/**
 * Fila de total de solo lectura para el pie de una sección — para que
 * Daniela pueda cotejar el subtotal contra su Excel y ubicar rápido en qué
 * sección se desvía un resultado.
 */
export function TotalSeccion({ etiqueta = 'Total', valor }) {
  return (
    <div className="campo-dinero total-seccion">
      <span>{etiqueta}</span>
      <strong>{formatearPesos(valor) || '0'}</strong>
    </div>
  );
}

/**
 * @param {{titulo:string, conceptos:{clave:string, etiqueta:string, nota?:string}[],
 *   valores:object, onCambiar:(clave:string, valor:number)=>void}} props
 */
export function SeccionConceptos({ titulo, conceptos, valores, onCambiar }) {
  const total = conceptos.reduce((s, c) => s + (Number(valores[c.clave]) || 0), 0);
  return (
    <fieldset className="seccion-conceptos">
      <legend>{titulo}</legend>
      {conceptos.map((c) => (
        <CampoDinero
          key={c.clave}
          etiqueta={c.etiqueta}
          nota={c.nota}
          valor={valores[c.clave]}
          onCambiar={(v) => onCambiar(c.clave, v)}
        />
      ))}
      <TotalSeccion valor={total} />
    </fieldset>
  );
}
