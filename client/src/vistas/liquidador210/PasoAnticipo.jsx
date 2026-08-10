import React from 'react';

const ETIQUETA_ANTIGUEDAD = {
  primerAnio: 'Primer año',
  segundoAnio: 'Segundo año',
  terceroYSiguientes: 'Tercer año y siguientes',
};

const TARIFA_POR_ANTIGUEDAD = { primerAnio: 0.25, segundoAnio: 0.5, terceroYSiguientes: 0.75 };

function formatoPesos(v) {
  return (v || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

export default function PasoAnticipo({ resultado, estado }) {
  const anticipoCalc = resultado?.intermedios?.anticipoCalc;
  const impuestoNetoAnioActual = resultado?.casillas?.[126] || 0;
  const retenciones = resultado?.casillas?.[132] || 0;
  const tarifa = TARIFA_POR_ANTIGUEDAD[estado.antiguedadDeclarante];

  if (!anticipoCalc) {
    return <div className="tarjeta">Completa los pasos anteriores para ver el cálculo del anticipo.</div>;
  }

  if (estado.antiguedadDeclarante === 'primerAnio') {
    return (
      <div>
        <div className="tarjeta">
          <strong>Anticipo de renta (Art. 807 ET) — casilla 133</strong>
          <p className="tenue" style={{ marginTop: '0.5rem' }}>{anticipoCalc.nota}</p>
        </div>
        <div className="tarjeta">
          <strong>Método 2 — año actual (único aplicable)</strong>
          <p className="tenue">126 actual × 25% − retenciones</p>
          <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>{formatoPesos(anticipoCalc.metodo2)}</p>
        </div>
        <div className="tarjeta">
          <strong>Anticipo a declarar (casilla 133)</strong>
          <p style={{ fontSize: '1.4rem', fontWeight: 700 }}>{formatoPesos(anticipoCalc.anticipo)}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="tarjeta">
        <strong>Anticipo de renta (Art. 807 ET) — casilla 133</strong>
        <p className="tenue" style={{ marginTop: '0.5rem' }}>
          Se declara el <strong>menor</strong> de los dos métodos siguientes (más beneficioso para el cliente).
          Antigüedad como declarante: <strong>{ETIQUETA_ANTIGUEDAD[estado.antiguedadDeclarante]}</strong> (tarifa{' '}
          {tarifa * 100}%).
        </p>
      </div>

      <div className="tarjeta">
        <table style={{ width: '100%' }}>
          <tbody>
            <tr>
              <td className="tenue">Impuesto neto de renta año gravable actual (casilla 126)</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatoPesos(impuestoNetoAnioActual)}</td>
            </tr>
            <tr>
              <td className="tenue">Impuesto neto de renta año anterior (dato digitado en Patrimonio)</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatoPesos(estado.impuestoNetoAnioAnterior)}</td>
            </tr>
            <tr>
              <td className="tenue">Retenciones en la fuente año gravable (casilla 132)</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatoPesos(retenciones)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="tarjeta" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px', borderLeft: anticipoCalc.metodoUsado === 1 ? '3px solid var(--primario)' : 'none', paddingLeft: anticipoCalc.metodoUsado === 1 ? '0.75rem' : 0 }}>
          <strong>Método 1 — promedio</strong>
          <p className="tenue">(126 actual + 126 anterior) / 2 × tarifa − retenciones</p>
          <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>{formatoPesos(anticipoCalc.metodo1)}</p>
          {anticipoCalc.metodoUsado === 1 && <p className="tenue">✓ Este es el que se declara (menor valor)</p>}
        </div>
        <div style={{ flex: '1 1 240px', borderLeft: anticipoCalc.metodoUsado === 2 ? '3px solid var(--primario)' : 'none', paddingLeft: anticipoCalc.metodoUsado === 2 ? '0.75rem' : 0 }}>
          <strong>Método 2 — año actual</strong>
          <p className="tenue">126 actual × tarifa − retenciones</p>
          <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>{formatoPesos(anticipoCalc.metodo2)}</p>
          {anticipoCalc.metodoUsado === 2 && <p className="tenue">✓ Este es el que se declara (menor valor)</p>}
        </div>
      </div>

      <div className="tarjeta">
        <strong>Anticipo a declarar (casilla 133)</strong>
        <p style={{ fontSize: '1.4rem', fontWeight: 700 }}>{formatoPesos(anticipoCalc.anticipo)}</p>
      </div>
    </div>
  );
}
