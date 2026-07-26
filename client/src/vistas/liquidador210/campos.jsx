import React from 'react';

function formatearPesos(valor) {
  if (!valor) return '';
  return Number(valor).toLocaleString('es-CO');
}

function limpiarPesos(texto) {
  const numero = Number(String(texto).replace(/[^\d-]/g, ''));
  return Number.isFinite(numero) ? numero : 0;
}

export function CampoDinero({ etiqueta, nota, valor, onCambiar }) {
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
        onChange={(e) => onCambiar(limpiarPesos(e.target.value))}
      />
    </label>
  );
}

/**
 * @param {{titulo:string, conceptos:{clave:string, etiqueta:string, nota?:string}[],
 *   valores:object, onCambiar:(clave:string, valor:number)=>void}} props
 */
export function SeccionConceptos({ titulo, conceptos, valores, onCambiar }) {
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
    </fieldset>
  );
}
