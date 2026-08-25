import { detalleImpuestoArt241 } from '../../motor210/constantes/tablaImpuesto241.js';

function formatoPesos(v) {
  return (v || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

function formatoUvt(v) {
  return (v || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 });
}

export default function PasoImpuesto({ resultado, estado }) {
  if (!resultado) return <div className="tarjeta">Completa los pasos anteriores para ver el cálculo del impuesto.</div>;

  const casilla111 = resultado.casillas[111] || 0;
  const detalle = detalleImpuestoArt241(casilla111, estado.uvt);
  const impuestoDiv = resultado.intermedios?.impuestoDiv;

  const hayDividendos =
    impuestoDiv && (impuestoDiv.impuestoSubcedula2 > 0 || impuestoDiv.impuestoDiv2016 > 0 || impuestoDiv.impuestoExterior > 0 || impuestoDiv.descuentoDividendos > 0);

  return (
    <div>
      <div className="tarjeta">
        <strong>Impuesto sobre la renta — tabla Art. 241 ET</strong>
        <p className="tenue" style={{ marginTop: '0.25rem' }}>
          Base gravable (casilla 111 — cédula general + pensiones + dividendos subcédula 1 y remanente subcédula 2):{' '}
          <strong>{formatoPesos(casilla111)}</strong> ({formatoUvt(detalle.baseUvt)} UVT)
        </p>
        <div className="tabla-scroll" style={{ marginTop: '0.5rem' }}>
          <table>
            <thead>
              <tr>
                <th>Desde (UVT)</th>
                <th>Hasta (UVT)</th>
                <th>Tarifa marginal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {detalle.tramos.map((t, i) => (
                <tr key={i} style={i === detalle.indiceTramoAplicado ? { fontWeight: 700, background: 'var(--alerta-fondo)' } : undefined}>
                  <td>{t.desde.toLocaleString('es-CO')}</td>
                  <td>{t.hasta === Infinity ? 'En adelante' : t.hasta.toLocaleString('es-CO')}</td>
                  <td>{(t.tarifa * 100).toFixed(0)}%</td>
                  <td>{i === detalle.indiceTramoAplicado ? '← tramo aplicado' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: '0.5rem' }}>
          Casilla 116 · Impuesto sobre RLC cédula general/pensiones/dividendos: <strong>{formatoPesos(resultado.casillas[116])}</strong>
        </p>
      </div>

      {hayDividendos && (
        <div className="tarjeta">
          <strong>Impuesto adicional por dividendos</strong>
          <table style={{ width: '100%', marginTop: '0.5rem' }}>
            <tbody>
              <tr>
                <td className="tenue">Casilla 118 · Subcédula 2 (tarifa plana 35%)</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatoPesos(resultado.casillas[118])}</td>
              </tr>
              <tr>
                <td className="tenue">Casilla 119 · Dividendos 2016 y anteriores (tabla propia)</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatoPesos(resultado.casillas[119])}</td>
              </tr>
              <tr>
                <td className="tenue">Casilla 120 · ECE/exterior (tarifa plana 35%)</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatoPesos(resultado.casillas[120])}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="tarjeta">
        <strong>Total y descuentos</strong>
        <table style={{ width: '100%', marginTop: '0.5rem' }}>
          <tbody>
            <tr>
              <td className="tenue">Casilla 121 · Total impuesto sobre rentas líquidas gravables (116+117+118+119+120)</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatoPesos(resultado.casillas[121])}</td>
            </tr>
            <tr>
              <td className="tenue">Casilla 124 · Descuento Art. 254-1 ET (dividendos)</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatoPesos(resultado.casillas[124])}</td>
            </tr>
            <tr>
              <td className="tenue">Casilla 125 · Total descuentos tributarios</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatoPesos(resultado.casillas[125])}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700 }}>Casilla 126 · Impuesto neto de renta (121-125)</td>
              <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '1.1rem' }}>{formatoPesos(resultado.casillas[126])}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
