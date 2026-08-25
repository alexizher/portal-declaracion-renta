import { useState } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../api.js';

// Nombres de columna aceptados (se normalizan sin tildes ni mayúsculas).
const ALIAS = {
  nombre: ['nombre', 'nombres', 'nombre completo', 'cliente', 'razon social'],
  email: ['email', 'correo', 'correo electronico', 'e-mail', 'mail'],
  cedula: ['cedula', 'cc', 'nit', 'documento', 'identificacion', 'numero de documento', 'no documento'],
  telefono: ['telefono', 'celular', 'movil', 'tel'],
};

function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function detectarColumnas(encabezados) {
  const mapa = {};
  for (const [campo, alias] of Object.entries(ALIAS)) {
    const idx = encabezados.findIndex((h) => alias.includes(normalizar(h)));
    if (idx >= 0) mapa[campo] = idx;
  }
  return mapa;
}

export default function ImportarExcel({ plantillas, onCerrar, onImportado }) {
  const [filas, setFilas] = useState(null);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [plantillaId, setPlantillaId] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  function leerArchivo(e) {
    const archivo = e.target.files[0];
    if (!archivo) return;
    setNombreArchivo(archivo.name);
    setError(null);
    const lector = new FileReader();
    lector.onload = (ev) => {
      try {
        const libro = XLSX.read(ev.target.result, { type: 'array' });
        const hoja = libro.Sheets[libro.SheetNames[0]];
        const matriz = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: '' });
        if (matriz.length < 2) throw new Error('El archivo no tiene filas de datos.');

        const columnas = detectarColumnas(matriz[0]);
        if (columnas.nombre === undefined || columnas.cedula === undefined) {
          throw new Error(
            'No encontré las columnas "nombre" y "cédula". Encabezados leídos: ' +
              matriz[0].join(', ')
          );
        }
        const datos = matriz
          .slice(1)
          .map((fila) => ({
            nombre: String(fila[columnas.nombre] ?? '').trim(),
            cedula: String(fila[columnas.cedula] ?? '').trim(),
            email: columnas.email !== undefined ? String(fila[columnas.email] ?? '').trim() : '',
            telefono:
              columnas.telefono !== undefined ? String(fila[columnas.telefono] ?? '').trim() : '',
          }))
          .filter((f) => f.nombre || f.cedula);
        if (!datos.length) throw new Error('No se encontraron filas con datos.');
        setFilas(datos);
      } catch (err) {
        setError(err.message);
        setFilas(null);
      }
    };
    lector.readAsArrayBuffer(archivo);
  }

  async function importar() {
    setEnviando(true);
    setError(null);
    try {
      const resultado = await api('/clientes/importar', {
        method: 'POST',
        body: { filas, plantillaId: plantillaId || null },
      });
      onImportado(resultado);
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="tarjeta modal ancho" onClick={(e) => e.stopPropagation()}>
        <h2>Importar clientes desde Excel/CSV</h2>
        <p className="tenue">
          El archivo debe tener encabezados. Se reconocen columnas como <em>nombre</em>,{' '}
          <em>cédula/NIT/documento</em>, <em>correo/email</em> y <em>teléfono/celular</em>.
        </p>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={leerArchivo} />

        {error && <div className="error">{error}</div>}

        {filas && (
          <>
            <p>
              <strong>{filas.length}</strong> filas leídas de <em>{nombreArchivo}</em>. Vista
              previa:
            </p>
            <div className="tabla-scroll" style={{ maxHeight: 240 }}>
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Cédula</th>
                    <th>Correo</th>
                    <th>Teléfono</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.slice(0, 10).map((f, i) => (
                    <tr key={i}>
                      <td>{f.nombre}</td>
                      <td>{f.cedula}</td>
                      <td>{f.email}</td>
                      <td>{f.telefono}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filas.length > 10 && <p className="tenue">…y {filas.length - 10} más.</p>}
            <label>
              Asignar lista de documentos a todos los importados (opcional)
              <select value={plantillaId} onChange={(e) => setPlantillaId(e.target.value)}>
                <option value="">— Sin asignar (lo haces luego uno a uno) —</option>
                {plantillas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        <div className="fila-botones">
          <button onClick={onCerrar}>Cancelar</button>
          <button className="primario" disabled={!filas || enviando} onClick={importar}>
            {enviando ? 'Importando…' : 'Importar'}
          </button>
        </div>
      </div>
    </div>
  );
}
