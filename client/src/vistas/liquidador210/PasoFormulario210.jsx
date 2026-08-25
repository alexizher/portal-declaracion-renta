import { SECCIONES_FORMULARIO_210 } from '../../motor210/etiquetasCasillas.js';

const CASILLAS_NO_MONETARIAS = new Set([1, 5, 6, 7, 8, 9, 10, 12, 24]);

function formatoPesos(v) {
  return (v || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

function formatoValor(casilla, valor) {
  if (CASILLAS_NO_MONETARIAS.has(casilla)) return valor || '—';
  return formatoPesos(valor);
}

export default function PasoFormulario210({ resultado }) {
  if (!resultado) return <div className="tarjeta">Completa los pasos anteriores para ver el Formulario 210.</div>;

  return (
    <div>
      <div className="tarjeta">
        <p className="tenue">
          Vista en pantalla del Formulario 210 con las casillas ya calculadas, en el mismo orden del formulario
          oficial. El Excel descargable en "Resultado" trae el mismo layout con el formato exacto de la DIAN.
        </p>
      </div>

      {SECCIONES_FORMULARIO_210.map((seccion) => (
        <div className="tarjeta" key={seccion.titulo}>
          <strong>{seccion.titulo}</strong>
          <table style={{ width: '100%', marginTop: '0.5rem' }}>
            <tbody>
              {seccion.casillas.map(({ casilla, etiqueta }) => (
                <tr key={casilla}>
                  <td className="tenue">Casilla {casilla} · {etiqueta}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {formatoValor(casilla, resultado.casillas[casilla])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
