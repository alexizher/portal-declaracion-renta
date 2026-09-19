import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../api.js';
import { ThOrdenable } from './Clientes.jsx';
import { normalizar } from './ImportarExcel.jsx';

const ESTADOS = [
  { id: 'nuevo', texto: 'Nuevo', clase: 'pill' },
  { id: 'contactado', texto: 'Contactado', clase: 'pill fecha' },
  { id: 'respondio', texto: 'Respondió', clase: 'pill ok' },
  { id: 'convertido', texto: 'Cliente', clase: 'pill aprobado' },
  { id: 'descartado', texto: 'Descartado', clase: 'pill pendiente' },
  { id: 'baja', texto: 'Dado de baja', clase: 'pill alerta' },
];
const estadoDe = (id) => ESTADOS.find((e) => e.id === id) || ESTADOS[0];

// Estados a los que todavía se les puede escribir.
const CONTACTABLES = ['nuevo', 'contactado', 'respondio'];

// Listo para el correo de captación: tiene correo y sigue contactable. El
// servidor vuelve a validar todo al enviar.
const listoParaEnvio = (p) => Boolean(p.email && CONTACTABLES.includes(p.estado));

// Valor por el que ordena cada columna. El estado ordena por su lugar en el
// embudo (nuevo → baja), no alfabéticamente; los que nunca recibieron correo
// van al final en "Último envío".
const EXTRACTORES_ORDEN = {
  nombre: (p) => (p.nombre || p.email).toLowerCase(),
  email: (p) => p.email,
  estado: (p) => String(ESTADOS.findIndex((e) => e.id === p.estado)),
  ultimoEnvio: (p) => p.ultimoEnvio || '9999',
};

const FILTROS = [
  { id: 'activos', texto: 'Por contactar' },
  { id: 'todos', texto: 'Todos' },
  ...ESTADOS.map((e) => ({ id: e.id, texto: e.texto })),
];

export default function Prospectos() {
  const [datos, setDatos] = useState(null);
  const [plantillas, setPlantillas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('activos');
  const [orden, setOrden] = useState({ campo: 'nombre', direccion: 'asc' });
  const [seleccion, setSeleccion] = useState(new Set());
  const [preview, setPreview] = useState(null);
  const [editando, setEditando] = useState(null);
  const [importando, setImportando] = useState(false);
  const [editandoMensaje, setEditandoMensaje] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);

  async function cargar() {
    const [d, pla] = await Promise.all([api('/prospectos'), api('/plantillas')]);
    setDatos(d);
    setPlantillas(pla);
  }

  useEffect(() => {
    cargar().catch((e) => setError(e.message));
  }, []);

  const prospectos = datos?.prospectos || [];

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return prospectos
      .filter((p) =>
        filtro === 'todos' ? true : filtro === 'activos' ? CONTACTABLES.includes(p.estado) : p.estado === filtro
      )
      .filter(
        (p) =>
          !q || p.nombre.toLowerCase().includes(q) || p.email.includes(q)
      )
      .sort((a, b) => {
        const extraer = EXTRACTORES_ORDEN[orden.campo];
        const signo = orden.direccion === 'asc' ? 1 : -1;
        return extraer(a).localeCompare(extraer(b), 'es', { numeric: true }) * signo;
      });
  }, [prospectos, busqueda, filtro, orden]);

  function alternarOrden(campo) {
    setOrden((o) =>
      o.campo === campo
        ? { campo, direccion: o.direccion === 'asc' ? 'desc' : 'asc' }
        : { campo, direccion: 'asc' }
    );
  }

  const listos = useMemo(() => visibles.filter(listoParaEnvio), [visibles]);
  const contactados = prospectos.filter((p) => p.ultimoEnvio).length;

  function alternar(id) {
    const s = new Set(seleccion);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSeleccion(s);
  }

  function seleccionarTodos() {
    if (seleccion.size === listos.length) setSeleccion(new Set());
    else setSeleccion(new Set(listos.map((p) => p.id)));
  }

  async function verPreview(p) {
    try {
      setPreview({ ...(await api(`/prospectos/${p.id}/previsualizar`)), ancho: 'movil' });
    } catch (err) {
      setError(err.message);
    }
  }

  async function enviar() {
    const n = seleccion.size;
    if (!window.confirm(`Se enviará el correo de captación a ${n} prospecto(s). ¿Continuar?`)) return;
    setEnviando(true);
    setError(null);
    setResultado(null);
    try {
      const { resultados } = await api('/prospectos/enviar', {
        method: 'POST',
        body: { ids: [...seleccion] },
      });
      setResultado(resultados);
      setSeleccion(new Set());
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (!datos) return error ? <div className="error">{error}</div> : <p className="tenue">Cargando…</p>;

  const { horario, limiteDiario, enviadosHoy } = datos;

  return (
    <section>
      <div className="fila-acciones">
        <input
          className="buscador"
          placeholder="Buscar por nombre o correo…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar por estado">
          {FILTROS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.texto}
            </option>
          ))}
        </select>
        <button onClick={() => setEditandoMensaje(true)}>Editar mensaje</button>
        <button className="primario" onClick={() => setImportando(true)}>
          Importar CSV/Excel
        </button>
      </div>

      {mensaje && <div className="aviso">{mensaje}</div>}
      {!horario.ok && <div className="aviso">Envío pausado: {horario.motivo}</div>}

      <p className="tenue">
        {prospectos.length} prospecto(s) · {contactados} ya contactado(s) · enviados hoy{' '}
        {enviadosHoy} de {limiteDiario}
      </p>

      <div className="tabla-scroll">
        <table>
          <thead>
            <tr>
              <th className="th-check">
                <input
                  type="checkbox"
                  aria-label="Seleccionar todos los listos"
                  disabled={listos.length === 0}
                  checked={listos.length > 0 && seleccion.size === listos.length}
                  onChange={seleccionarTodos}
                />
              </th>
              <ThOrdenable campo="nombre" orden={orden} onClick={alternarOrden}>Nombre</ThOrdenable>
              <ThOrdenable campo="email" orden={orden} onClick={alternarOrden} className="oculta-movil">Correo</ThOrdenable>
              <ThOrdenable campo="estado" orden={orden} onClick={alternarOrden}>Estado</ThOrdenable>
              <ThOrdenable campo="ultimoEnvio" orden={orden} onClick={alternarOrden} className="oculta-movil">Último envío</ThOrdenable>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((p) => {
              const listo = listoParaEnvio(p);
              const estado = estadoDe(p.estado);
              return (
                <tr key={p.id} className={listo ? '' : 'fila-tenue'}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar ${p.nombre || p.email}`}
                      disabled={!listo}
                      checked={seleccion.has(p.id)}
                      onChange={() => alternar(p.id)}
                    />
                  </td>
                  <td>
                    {p.nombre || <span className="tenue">sin nombre</span>}
                    <div className="tenue solo-movil">{p.email}</div>
                  </td>
                  <td className="oculta-movil">{p.email}</td>
                  <td>
                    <span className={estado.clase}>{estado.texto}</span>
                  </td>
                  <td className="oculta-movil">
                    {p.ultimoEnvio ? (
                      new Date(p.ultimoEnvio).toLocaleDateString('es-CO')
                    ) : (
                      <span className="tenue">nunca</span>
                    )}
                  </td>
                  <td className="acciones">
                    <button onClick={() => verPreview(p)}>Ver correo</button>
                    <button onClick={() => setEditando(p)}>Editar</button>
                  </td>
                </tr>
              );
            })}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={6} className="tenue centrado">
                  {prospectos.length === 0
                    ? 'Aún no hay prospectos. Importa la lista desde CSV o Excel.'
                    : 'Ningún prospecto coincide con el filtro.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && <div className="error">{error}</div>}
      <button
        className="primario grande"
        disabled={seleccion.size === 0 || enviando || !horario.ok}
        onClick={enviar}
      >
        {enviando
          ? 'Enviando… (esto puede tardar, ~2 s por correo)'
          : `Enviar correo de captación a ${seleccion.size} prospecto(s)`}
      </button>

      {resultado && (
        <div className="tarjeta">
          <h2>Resultado del envío</h2>
          <ul className="lista-resultado">
            {resultado.map((r) => (
              <li key={r.id} className={r.estado}>
                <strong>{r.nombre}</strong> ({r.email || 'sin correo'}): {r.estado}
                {r.error ? `: ${r.error}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {preview && <VistaPrevia preview={preview} setPreview={setPreview} />}

      {editando && (
        <FormularioProspecto
          prospecto={editando}
          plantillas={plantillas}
          onCerrar={() => setEditando(null)}
          onGuardado={(texto) => {
            setEditando(null);
            if (texto) setMensaje(texto);
            cargar();
          }}
        />
      )}

      {importando && (
        <ImportarProspectos
          onCerrar={() => setImportando(false)}
          onImportado={(r) => {
            setImportando(false);
            setMensaje(
              `Importación: ${r.agregados} agregados. Omitidos: ${r.duplicados} repetidos, ` +
                `${r.cortados} con el nombre cortado, ${r.yaClientes} que ya son clientes y ` +
                `${r.invalidos} sin correo válido.`
            );
            cargar();
          }}
        />
      )}

      {editandoMensaje && <EditorMensaje onCerrar={() => setEditandoMensaje(false)} />}
    </section>
  );
}

// El correo de captación es un documento HTML completo con su propio
// <style>: se muestra en un iframe para que no afecte los estilos del panel,
// con opción de verlo al ancho de un celular.
function VistaPrevia({ preview, setPreview }) {
  return (
    <div className="modal-fondo" onClick={() => setPreview(null)}>
      <div className="tarjeta modal ancho" onClick={(e) => e.stopPropagation()}>
        <h2>Vista previa</h2>
        <p>
          <strong>Para:</strong> {preview.para || <span className="tenue">sin correo</span>}
          <br />
          <strong>Asunto:</strong> {preview.asunto}
        </p>
        {preview.advertencias.length > 0 && (
          <div className="aviso">No se le enviaría: {preview.advertencias.join(' ')}</div>
        )}
        <div className="selector-tipo">
          <button
            className={preview.ancho === 'movil' ? 'activo' : ''}
            onClick={() => setPreview({ ...preview, ancho: 'movil' })}
          >
            Celular
          </button>
          <button
            className={preview.ancho === 'escritorio' ? 'activo' : ''}
            onClick={() => setPreview({ ...preview, ancho: 'escritorio' })}
          >
            Escritorio
          </button>
        </div>
        <iframe
          title="Vista previa del correo"
          className={`preview-iframe ${preview.ancho}`}
          srcDoc={preview.html}
          sandbox=""
        />
        <div className="fila-botones">
          <button onClick={() => setPreview(null)}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function FormularioProspecto({ prospecto, plantillas, onCerrar, onGuardado }) {
  const [datos, setDatos] = useState({ ...prospecto });
  const [cedula, setCedula] = useState('');
  const [plantillaId, setPlantillaId] = useState('');
  const [error, setError] = useState(null);

  function campo(nombre) {
    return {
      value: datos[nombre] || '',
      onChange: (e) => setDatos({ ...datos, [nombre]: e.target.value }),
    };
  }

  async function guardar(e) {
    e.preventDefault();
    setError(null);
    try {
      await api(`/prospectos/${prospecto.id}`, { method: 'PUT', body: datos });
      onGuardado();
    } catch (err) {
      setError(err.message);
    }
  }

  async function convertir() {
    setError(null);
    try {
      // Guarda primero lo editado (p. ej. el nombre, que es obligatorio para
      // crear el cliente).
      await api(`/prospectos/${prospecto.id}`, { method: 'PUT', body: datos });
      const r = await api(`/prospectos/${prospecto.id}/convertir`, {
        method: 'POST',
        body: { cedula, plantillaId: plantillaId || null },
      });
      onGuardado(`${r.cliente.nombre} ya está en Clientes. Desde Correos puedes enviarle la invitación al portal.`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function eliminar() {
    if (!window.confirm(`¿Eliminar a ${prospecto.nombre || prospecto.email}?`)) return;
    try {
      await api(`/prospectos/${prospecto.id}`, { method: 'DELETE' });
      onGuardado();
    } catch (err) {
      setError(err.message);
    }
  }

  const convertido = Boolean(prospecto.clienteId);

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="tarjeta modal" onClick={(e) => e.stopPropagation()} onSubmit={guardar}>
        <h2>{prospecto.nombre || 'Prospecto'}</h2>
        {prospecto.origen && <p className="tenue">Importado de {prospecto.origen}</p>}
        <label>
          Nombre
          <input {...campo('nombre')} placeholder="Si lo conoces" />
        </label>
        <label>
          Correo electrónico *
          <input type="email" {...campo('email')} required />
        </label>
        <label>
          Estado
          <select {...campo('estado')} disabled={convertido}>
            {ESTADOS.filter((e) => e.id !== 'convertido' || convertido).map((e) => (
              <option key={e.id} value={e.id}>
                {e.texto}
              </option>
            ))}
          </select>
        </label>
        {datos.estado === 'baja' && (
          <p className="tenue">Dado de baja: no se le vuelve a enviar ningún correo de captación.</p>
        )}
        <label>
          Notas
          <textarea rows={2} {...campo('notas')} />
        </label>

        {!convertido && (
          <fieldset className="convertir">
            <legend>Convertir en cliente</legend>
            <label>
              Cédula (sin dígito de verificación)
              <input value={cedula} onChange={(e) => setCedula(e.target.value)} inputMode="numeric" />
            </label>
            <label>
              Lista de documentos
              <select value={plantillaId} onChange={(e) => setPlantillaId(e.target.value)}>
                <option value="">— Sin asignar —</option>
                {plantillas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={convertir}>
              Pasar a Clientes
            </button>
          </fieldset>
        )}

        {error && <div className="error">{error}</div>}
        <div className="fila-botones">
          <button type="button" className="peligro" onClick={eliminar}>
            Eliminar
          </button>
          <button type="button" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="primario">
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}

// Solo se leen nombre y correo: el resto de columnas de la base (NIT,
// ingresos, fechas…) se ignora a propósito (minimización, Ley 1581).
const ALIAS = {
  nombre: ['nombre', 'nombres', 'nombre completo', 'razon social'],
  email: ['email', 'correo', 'correo electronico', 'e-mail', 'mail'],
};

function ImportarProspectos({ onCerrar, onImportado }) {
  const [filas, setFilas] = useState(null);
  const [nombreArchivo, setNombreArchivo] = useState('');
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
        const libro = XLSX.read(ev.target.result, { type: 'array', raw: true });
        const hoja = libro.Sheets[libro.SheetNames[0]];
        const matriz = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: '', raw: false });
        if (matriz.length < 2) throw new Error('El archivo no tiene filas de datos.');

        const encabezados = matriz[0].map(normalizar);
        const col = {};
        for (const [campo, alias] of Object.entries(ALIAS)) {
          const idx = encabezados.findIndex((h) => alias.includes(h));
          if (idx >= 0) col[campo] = idx;
        }
        if (col.email === undefined) {
          throw new Error('No encontré la columna del correo. Encabezados leídos: ' + matriz[0].join(', '));
        }
        const valor = (fila, campo) => (col[campo] !== undefined ? String(fila[col[campo]] ?? '').trim() : '');
        const datos = matriz
          .slice(1)
          .map((fila) => ({ nombre: valor(fila, 'nombre'), email: valor(fila, 'email') }))
          .filter((f) => f.email);
        if (!datos.length) throw new Error('No se encontraron filas con correo.');
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
      onImportado(
        await api('/prospectos/importar', { method: 'POST', body: { filas, origen: nombreArchivo } })
      );
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="tarjeta modal ancho" onClick={(e) => e.stopPropagation()}>
        <h2>Importar prospectos desde CSV/Excel</h2>
        <p className="tenue">
          Solo se guardan el <em>nombre</em> y el <em>correo</em> (obligatorio); las demás
          columnas se ignoran. Se omiten los correos repetidos, los nombres cortados (que
          terminan en «de», «del», «la»…) y quienes ya son clientes.
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
                    <th>Correo</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.slice(0, 10).map((f, i) => (
                    <tr key={i}>
                      <td>{f.nombre}</td>
                      <td>{f.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filas.length > 10 && <p className="tenue">…y {filas.length - 10} más.</p>}
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

function EditorMensaje({ onCerrar }) {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api('/config').then(setConfig).catch((e) => setError(e.message));
  }, []);

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      await api('/config', {
        method: 'PUT',
        body: { asunto_captacion: config.asunto_captacion, cuerpo_captacion: config.cuerpo_captacion },
      });
      onCerrar();
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="tarjeta modal ancho" onClick={(e) => e.stopPropagation()}>
        <h2>Mensaje de captación</h2>
        <p className="tenue">
          Variables: {'{{saludo}}'} («Hola Ana,» o «Hola,» si no hay nombre), {'{{fechas}}'} (tabla
          de los plazos que aún no vencen), {'{{ultimo_plazo}}'} y {'{{baja}}'} (enlace para darse
          de baja, obligatorio). Usa «Ver correo» en la lista para revisar cómo queda.
        </p>
        {!config ? (
          <p className="tenue">Cargando…</p>
        ) : (
          <>
            <label>
              Asunto
              <input
                value={config.asunto_captacion || ''}
                onChange={(e) => setConfig({ ...config, asunto_captacion: e.target.value })}
              />
            </label>
            <label>
              Cuerpo (documento HTML)
              <textarea
                rows={14}
                value={config.cuerpo_captacion || ''}
                onChange={(e) => setConfig({ ...config, cuerpo_captacion: e.target.value })}
              />
            </label>
            {!(config.cuerpo_captacion || '').includes('{{baja}}') && (
              <div className="aviso">El cuerpo no tiene el enlace {'{{baja}}'} para darse de baja.</div>
            )}
          </>
        )}
        {error && <div className="error">{error}</div>}
        <div className="fila-botones">
          <button onClick={onCerrar}>Cancelar</button>
          <button className="primario" disabled={!config || guardando} onClick={guardar}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
