import { useState } from 'react';
import { generarPapelTrabajo } from '../../motor210/papelTrabajo.js';
import AnexosDeclaracion from './AnexosDeclaracion.jsx';

const FILAS_RESUMEN = [
  { casilla: 29, etiqueta: 'Patrimonio bruto' },
  { casilla: 31, etiqueta: 'Patrimonio líquido' },
  { casilla: 97, etiqueta: 'Renta líquida gravable cédula general' },
  { casilla: 116, etiqueta: 'Impuesto sobre la renta (Art. 241 ET)' },
  { casilla: 125, etiqueta: 'Descuentos tributarios' },
  { casilla: 126, etiqueta: 'Impuesto neto de renta' },
  { casilla: 129, etiqueta: 'Total impuesto a cargo' },
  { casilla: 130, etiqueta: 'Anticipo año anterior', nota: 'renglón 133 del F210 anterior' },
  { casilla: 131, etiqueta: 'Saldo a favor año anterior sin solicitud' },
  { casilla: 132, etiqueta: 'Retenciones año gravable' },
  { casilla: 133, etiqueta: 'Anticipo año siguiente' },
  { casilla: 134, etiqueta: 'Saldo a pagar' },
  { casilla: 137, etiqueta: 'Saldo a favor' },
];

function formatoPesos(v) {
  return (v || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

export default function PasoResultado({ resultado, cliente, estado, onCambiar }) {
  const [mostrarAnexos, setMostrarAnexos] = useState(false);

  if (!resultado) return <div className="tarjeta">Completa los pasos anteriores para ver el resultado.</div>;

  const comparacion = resultado.intermedios?.comparacion;
  const hayHallazgoPatrimonial = comparacion && comparacion.rentaPorComparacion > 0;

  return (
    <div>
      {resultado.advertencias.length > 0 && (
        <div className="tarjeta aviso">
          <strong>Advertencias — revisar antes de presentar:</strong>
          <ul>
            {resultado.advertencias.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {hayHallazgoPatrimonial && !estado.incluirComparacionPatrimonial && (
        <div className="tarjeta aviso">
          <p>
            Hay una diferencia de <strong>{formatoPesos(comparacion.rentaPorComparacion)}</strong> entre el
            crecimiento del patrimonio y lo que la renta declarada explica (Art. 236-239 ET). Verifica con el
            cliente si hay activos omitidos o pasivos inexistentes antes de incluirla.
          </p>
          <button type="button" onClick={() => onCambiar({ ...estado, incluirComparacionPatrimonial: true })}>
            Incluir en la casilla 96 y recalcular
          </button>
        </div>
      )}

      <div className="tarjeta">
        <strong>Formulario 210 — borrador</strong>
        <table style={{ width: '100%', marginTop: '0.5rem' }}>
          <tbody>
            {FILAS_RESUMEN.map(({ casilla, etiqueta, nota }) => (
              <tr key={casilla}>
                <td className="tenue">
                  Casilla {casilla} · {etiqueta}
                  {nota && <span> — {nota}</span>}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatoPesos(resultado.casillas[casilla])}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="fila-botones">
          <button type="button" className="primario" onClick={() => setMostrarAnexos(true)}>
            Ver anexos de la declaración
          </button>
          <button type="button" onClick={() => generarPapelTrabajo(resultado, cliente)}>
            Descargar papel de trabajo (Excel)
          </button>
        </div>
      </div>

      <p className="tenue">
        ⚠️ Borrador de trabajo prediligenciado por algoritmos. Verifica cada cifra contra los certificados y
        soportes del cliente antes de firmar y presentar la declaración — la responsabilidad es de la
        contadora que revisa y firma.
      </p>

      {mostrarAnexos && (
        <AnexosDeclaracion
          resultado={resultado}
          estado={estado}
          cliente={cliente}
          onCerrar={() => setMostrarAnexos(false)}
        />
      )}
    </div>
  );
}
