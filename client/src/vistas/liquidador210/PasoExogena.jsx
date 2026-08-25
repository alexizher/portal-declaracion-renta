import { useState } from 'react';
import * as XLSX from 'xlsx';
import { parsearReporteExogena, clasificarFilasExogena, agruparSugerencias } from '../../motor210/clasificarExogena.js';

function formatearPesos(v) {
  return (v || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

function soloDigitos(cedula) {
  return (cedula || '').replace(/\D/g, '');
}

// Algunos exportes reales del MUISCA declaran un rango (!ref) más chico
// que los datos que realmente contienen (visto en archivos reales: decía
// A1:H15 con datos hasta la fila 426) — SheetJS trunca a ese rango
// declarado si no se corrige antes de convertir a filas.
function repararRango(hoja) {
  const claves = Object.keys(hoja).filter((k) => !k.startsWith('!'));
  let maxRow = 0;
  let maxCol = 0;
  for (const k of claves) {
    const m = /^([A-Z]+)(\d+)$/.exec(k);
    if (!m) continue;
    maxRow = Math.max(maxRow, Number(m[2]));
    maxCol = Math.max(maxCol, XLSX.utils.decode_col(m[1]));
  }
  if (maxRow > 0) {
    hoja['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxRow - 1, c: maxCol } });
  }
  return hoja;
}

function aplicarParche(estado, ruta, valor) {
  const copia = structuredClone(estado);
  let nodo = copia;
  for (let i = 0; i < ruta.length - 1; i++) nodo = nodo[ruta[i]];
  const clave = ruta[ruta.length - 1];
  // REEMPLAZA, no suma: si Daniela vuelve a cargar la exógena del mismo
  // cliente (archivo corregido, o solo revisando de nuevo), el prellenado
  // debe dejar el campo en el valor que trae ESTE archivo, no acumular
  // sobre lo que había quedado de una carga anterior.
  nodo[clave] = valor;
  return copia;
}

export default function PasoExogena({ estado, onCambiar }) {
  const [filas, setFilas] = useState(null);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState(null);
  const [clasificado, setClasificado] = useState(null); // {topes, campos, filasRetenciones, sinClasificar}
  const [verCrudo, setVerCrudo] = useState(false);
  const [aplicado, setAplicado] = useState(false);

  function leerArchivo(e) {
    const archivo = e.target.files[0];
    if (!archivo) return;
    setNombreArchivo(archivo.name);
    setError(null);
    setAplicado(false);
    const lector = new FileReader();
    lector.onload = (ev) => {
      try {
        const libro = XLSX.read(ev.target.result, { type: 'array' });
        const hoja = repararRango(libro.Sheets[libro.SheetNames[0]]);
        const matriz = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: '' });
        setFilas(matriz);

        const reporte = parsearReporteExogena(matriz);
        if (reporte.reconocido) {
          const { sugerencias, sinClasificar } = clasificarFilasExogena(reporte.detalle);
          const { campos, filasRetenciones } = agruparSugerencias(sugerencias);
          setClasificado({ topes: reporte.topes, campos, filasRetenciones, sinClasificar, consultante: reporte.consultante });
        } else {
          setClasificado(null);
        }
      } catch (err) {
        setError('No se pudo leer el archivo: ' + err.message);
        setFilas(null);
        setClasificado(null);
      }
    };
    lector.readAsArrayBuffer(archivo);
  }

  const cedulaCliente = soloDigitos(estado.cliente.cedula);
  const cedulaArchivo = clasificado ? soloDigitos(clasificado.consultante.cedula) : '';
  const archivoSinIdentificar = clasificado && !cedulaArchivo;
  const clienteNoCoincide = clasificado && cedulaArchivo && cedulaArchivo !== cedulaCliente;

  function prellenarCedulas() {
    if (!clasificado || clienteNoCoincide) return;
    let nuevo = estado;
    for (const campo of clasificado.campos) {
      nuevo = aplicarParche(nuevo, campo.ruta, campo.valor);
    }
    // Reemplaza las retenciones que vinieron de una exógena cargada antes
    // (origen:'exogena') por las de este archivo — sin duplicar. Las que
    // Daniela haya agregado a mano (sin ese origen) se conservan.
    const retencionesManuales = nuevo.filasRetenciones.filter((f) => f.origen !== 'exogena');
    nuevo = { ...nuevo, filasRetenciones: [...retencionesManuales, ...clasificado.filasRetenciones] };
    onCambiar(nuevo);
    setAplicado(true);
  }

  const encabezados = filas?.[0] || [];
  const cuerpo = filas?.slice(1) || [];
  const filtradas = busqueda
    ? cuerpo.filter((f) => f.some((c) => String(c).toLowerCase().includes(busqueda.toLowerCase())))
    : cuerpo;

  return (
    <div className="tarjeta">
      <p className="tenue">
        Carga el reporte de exógena descargado del MUISCA (Consultas → Información reportada por terceros). Se
        procesa en tu navegador, no sube a ningún servidor. La herramienta sugiere en qué cédula/casilla va cada
        valor a partir de la columna "Uso declaración Sugerida" del propio reporte — revisa y corrige antes de
        continuar, no es un cálculo definitivo.
      </p>
      <input type="file" accept=".xlsx,.xls,.csv" onChange={leerArchivo} />
      {error && <div className="error">{error}</div>}

      {clienteNoCoincide && (
        <div className="tarjeta aviso" style={{ marginTop: '0.75rem', borderColor: 'var(--peligro)' }}>
          <strong>⚠️ Este archivo es de otra persona — no se prellena nada.</strong>
          <p style={{ margin: '0.35rem 0 0' }}>
            Cliente activo en el asistente: <strong>{estado.cliente.cedula}</strong>{estado.cliente.nombre && ` (${estado.cliente.nombre})`}.
            <br />
            Cédula/NIT del reporte cargado: <strong>{clasificado.consultante.cedula}</strong>
            {clasificado.consultante.nombre && ` (${clasificado.consultante.nombre})`}.
          </p>
          <p className="tenue" style={{ margin: '0.35rem 0 0' }}>
            Revisa que estás en el cliente correcto (paso 1) o que subiste el archivo que corresponde.
          </p>
        </div>
      )}

      {archivoSinIdentificar && (
        <div className="tarjeta aviso" style={{ marginTop: '0.75rem' }}>
          No se pudo leer la cédula del consultante en este archivo — no se puede verificar automáticamente que
          sea del cliente correcto. Revisa tú misma que corresponde antes de prellenar.
        </div>
      )}

      {clasificado && (
        <>
          {clasificado.topes.length > 0 && (
            <div className="tarjeta" style={{ marginTop: '0.75rem' }}>
              <strong>Topes reportados por la DIAN (solo referencia — no se prellenan, ya están en el detalle de abajo)</strong>
              <ul>
                {clasificado.topes.map((t, i) => (
                  <li key={i}>
                    {t.detalle}: {formatearPesos(t.valor)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="tarjeta" style={{ marginTop: '0.75rem' }}>
            <strong>Se reconocieron {clasificado.campos.length} campo(s) y {clasificado.filasRetenciones.length} retención(es)</strong>
            <div className="tabla-scroll" style={{ maxHeight: 260, marginTop: '0.5rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>Campo</th>
                    <th>Valor</th>
                    <th className="oculta-movil">De dónde sale</th>
                  </tr>
                </thead>
                <tbody>
                  {clasificado.campos.map((c, i) => (
                    <tr key={i}>
                      <td>{c.ruta.join(' → ')}</td>
                      <td>{formatearPesos(c.valor)}</td>
                      <td className="oculta-movil tenue">{c.detalle.length} movimiento(s)</td>
                    </tr>
                  ))}
                  {clasificado.filasRetenciones.map((r, i) => (
                    <tr key={'ret' + i}>
                      <td>Retención — {r.agenteRetenedor}</td>
                      <td>{formatearPesos(r.retencion)}</td>
                      <td className="oculta-movil tenue">se agrega a la tabla de retenciones</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="fila-botones">
              <button type="button" className="primario" onClick={prellenarCedulas} disabled={clienteNoCoincide}>
                {clienteNoCoincide
                  ? 'Bloqueado — el archivo es de otra cédula ↑'
                  : aplicado
                  ? '✓ Aplicado — volver a aplicar'
                  : 'Prellenar cédulas con estos valores →'}
              </button>
            </div>
            {aplicado && !clienteNoCoincide && (
              <p className="tenue">
                Prellenado en el paso "Cédulas" y "Patrimonio y año anterior" (tabla de retenciones). Revisa cada
                campo ahí — puedes editar cualquier valor. Si cargas otra exógena (o la misma corregida) y vuelves
                a prellenar, estos valores se REEMPLAZAN por los nuevos, no se suman.
              </p>
            )}
          </div>

          {clasificado.sinClasificar.length > 0 && (
            <div className="tarjeta aviso" style={{ marginTop: '0.75rem' }}>
              <strong>{clasificado.sinClasificar.length} fila(s) sin clasificar automáticamente — revisar y digitar a mano si aplica</strong>
              <div className="tabla-scroll" style={{ maxHeight: 260, marginTop: '0.5rem' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Detalle</th>
                      <th>Informante</th>
                      <th>Valor</th>
                      <th>Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clasificado.sinClasificar.map((f, i) => (
                      <tr key={i}>
                        <td className="celda-truncada">{f.detalle}</td>
                        <td className="celda-truncada oculta-movil">{f.nombreInformante}</td>
                        <td>{formatearPesos(f.valor)}</td>
                        <td className="tenue celda-truncada">{f.motivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {filas && (
        <div className="tarjeta" style={{ marginTop: '0.75rem' }}>
          <button type="button" onClick={() => setVerCrudo(!verCrudo)}>
            {verCrudo ? '▾' : '▸'} Ver reporte completo ({cuerpo.length} filas de {nombreArchivo})
          </button>
          {verCrudo && (
            <>
              <input
                className="buscador"
                type="text"
                placeholder="Buscar concepto, NIT informante, valor…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{ marginTop: '0.5rem' }}
              />
              <div className="tabla-scroll" style={{ maxHeight: 420, marginTop: '0.5rem' }}>
                <table>
                  <thead>
                    <tr>
                      {encabezados.map((h, i) => (
                        <th key={i}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtradas.slice(0, 500).map((f, i) => (
                      <tr key={i}>
                        {f.map((c, j) => (
                          <td key={j} className="celda-truncada">{String(c)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtradas.length > 500 && <p className="tenue">Mostrando las primeras 500 filas de {filtradas.length}.</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
