import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import ImportarExcel from './ImportarExcel.jsx';

const CLIENTE_VACIO = {
  nombre: '',
  email: '',
  cedula: '',
  telefono: '',
  plantillaId: '',
  notas: '',
  declarado: false,
};

// Clase de color de la fecha de vencimiento según los días que faltan:
// verde normal → amarillo (≤15) → naranja (≤8) → rojo (≤3) → rojo fuerte (hoy).
export function claseVencimiento(fechaIso) {
  const [y, m, d] = fechaIso.split('-').map(Number);
  const hoy = new Date();
  const dias = Math.round(
    (Date.UTC(y, m - 1, d) - Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) / 86400000
  );
  if (dias < 0) return 'pill vencido';
  if (dias === 0) return 'pill f0';
  if (dias <= 3) return 'pill f3';
  if (dias <= 8) return 'pill f8';
  if (dias <= 15) return 'pill f15';
  return 'pill fecha';
}

// Valores para ordenar cada columna — separado de lo que se muestra en la
// celda (ej. "Vence" muestra la fecha, pero un cliente que ya declaró debe
// ordenar como "sin vencimiento pendiente", no por su fecha vieja).
const EXTRACTORES_ORDEN = {
  nombre: (c) => (c.nombre || '').toLowerCase(),
  cedula: (c) => c.cedula || '',
  email: (c) => (c.email || '').toLowerCase(),
  vencimiento: (c) => (c.declarado ? '9999-99-99' : c.vencimiento?.fecha || '9999-99-98'),
  documentos: (c, nombrePlantilla) => nombrePlantilla(c.plantillaId).toLowerCase(),
  ultimoEnvio: (c) => c.ultimoEnvio || '',
};

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState(null); // null | 'nuevo' | cliente
  const [importando, setImportando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [orden, setOrden] = useState({ campo: 'nombre', direccion: 'asc' });

  function alternarOrden(campo) {
    setOrden((o) =>
      o.campo === campo ? { campo, direccion: o.direccion === 'asc' ? 'desc' : 'asc' } : { campo, direccion: 'asc' }
    );
  }

  async function cargar() {
    const [cli, pla] = await Promise.all([api('/clientes'), api('/plantillas')]);
    setClientes(cli);
    setPlantillas(pla);
  }

  useEffect(() => {
    cargar().catch((e) => setMensaje(e.message));
  }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.email.includes(q) ||
        c.cedula.includes(q)
    );
  }, [clientes, busqueda]);

  function nombrePlantilla(id) {
    return plantillas.find((p) => p.id === id)?.nombre || '—';
  }

  const ordenados = useMemo(() => {
    const extraer = EXTRACTORES_ORDEN[orden.campo];
    const signo = orden.direccion === 'asc' ? 1 : -1;
    return [...filtrados].sort((a, b) => {
      const va = extraer(a, nombrePlantilla);
      const vb = extraer(b, nombrePlantilla);
      return va.localeCompare(vb, 'es', { numeric: true }) * signo;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrados, orden, plantillas]);

  async function eliminar(cliente) {
    if (!window.confirm(`¿Eliminar a ${cliente.nombre}?`)) return;
    await api(`/clientes/${cliente.id}`, { method: 'DELETE' });
    cargar();
  }

  return (
    <section>
      <div className="fila-acciones">
        <input
          className="buscador"
          placeholder="Buscar por nombre, correo o cédula…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <button onClick={() => setImportando(true)}>Importar Excel/CSV</button>
        <button className="primario" onClick={() => setEditando('nuevo')}>
          + Agregar cliente
        </button>
      </div>

      {mensaje && <div className="aviso">{mensaje}</div>}

      <div className="tabla-scroll">
        <table>
          <thead>
            <tr>
              <ThOrdenable campo="nombre" orden={orden} onClick={alternarOrden}>Nombre</ThOrdenable>
              <ThOrdenable campo="cedula" orden={orden} onClick={alternarOrden} className="oculta-movil">Cédula / NIT</ThOrdenable>
              <ThOrdenable campo="email" orden={orden} onClick={alternarOrden} className="oculta-movil">Correo</ThOrdenable>
              <ThOrdenable campo="vencimiento" orden={orden} onClick={alternarOrden}>Vence</ThOrdenable>
              <ThOrdenable campo="documentos" orden={orden} onClick={alternarOrden} className="oculta-movil">Documentos</ThOrdenable>
              <ThOrdenable campo="ultimoEnvio" orden={orden} onClick={alternarOrden} className="oculta-movil">Último envío</ThOrdenable>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ordenados.map((c) => (
              <tr key={c.id}>
                <td>{c.nombre}</td>
                <td className="oculta-movil">{c.cedula}</td>
                <td className="oculta-movil">{c.email || <span className="tenue">sin correo</span>}</td>
                <td>
                  {c.declarado ? (
                    <span className="pill aprobado">Declaró ✓</span>
                  ) : c.vencimiento ? (
                    <span className={claseVencimiento(c.vencimiento.fecha)}>
                      {c.vencimiento.fecha}
                    </span>
                  ) : (
                    <span className="pill alerta">sin fecha</span>
                  )}
                </td>
                <td className="oculta-movil">{nombrePlantilla(c.plantillaId)}</td>
                <td className="oculta-movil">
                  {c.ultimoEnvio ? (
                    new Date(c.ultimoEnvio).toLocaleDateString('es-CO')
                  ) : (
                    <span className="tenue">nunca</span>
                  )}
                </td>
                <td className="acciones">
                  <button onClick={() => setEditando(c)}>Editar</button>
                  <button className="peligro" onClick={() => eliminar(c)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {ordenados.length === 0 && (
              <tr>
                <td colSpan={7} className="tenue centrado">
                  {clientes.length === 0
                    ? 'Aún no hay clientes. Importa tu Excel o agrega el primero.'
                    : 'Sin resultados para la búsqueda.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="tenue">{clientes.length} cliente(s) en total</p>

      {editando && (
        <FormularioCliente
          inicial={editando === 'nuevo' ? CLIENTE_VACIO : editando}
          esNuevo={editando === 'nuevo'}
          plantillas={plantillas}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            cargar();
          }}
        />
      )}

      {importando && (
        <ImportarExcel
          plantillas={plantillas}
          onCerrar={() => setImportando(false)}
          onImportado={(r) => {
            setImportando(false);
            setMensaje(
              `Importación: ${r.agregados} agregados, ${r.duplicados} duplicados omitidos, ${r.invalidos} filas inválidas.`
            );
            cargar();
          }}
        />
      )}
    </section>
  );
}

function ThOrdenable({ campo, orden, onClick, className, children }) {
  const activo = orden.campo === campo;
  return (
    <th className={className}>
      <button
        type="button"
        className={'th-ordenable' + (activo ? ' activo' : '')}
        onClick={() => onClick(campo)}
      >
        {children}
        <span className="th-flecha">{activo ? (orden.direccion === 'asc' ? '▲' : '▼') : '↕'}</span>
      </button>
    </th>
  );
}

function FormularioCliente({ inicial, esNuevo, plantillas, onCerrar, onGuardado }) {
  const [datos, setDatos] = useState({ ...CLIENTE_VACIO, ...inicial });
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
      if (esNuevo) {
        await api('/clientes', { method: 'POST', body: datos });
      } else {
        await api(`/clientes/${inicial.id}`, { method: 'PUT', body: datos });
      }
      onGuardado();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="tarjeta modal" onClick={(e) => e.stopPropagation()} onSubmit={guardar}>
        <h2>{esNuevo ? 'Nuevo cliente' : `Editar: ${inicial.nombre}`}</h2>
        <label>
          Nombre completo *
          <input {...campo('nombre')} required />
        </label>
        <label>
          Cédula / NIT (sin dígito de verificación) *
          <input {...campo('cedula')} required />
        </label>
        <label>
          Correo electrónico
          <input type="email" {...campo('email')} />
        </label>
        <label>
          Teléfono
          <input {...campo('telefono')} />
        </label>
        <label>
          Lista de documentos
          <select {...campo('plantillaId')}>
            <option value="">— Sin asignar —</option>
            {plantillas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Notas
          <textarea rows={2} {...campo('notas')} />
        </label>
        <label className="inline">
          <input
            type="checkbox"
            checked={Boolean(datos.declarado)}
            onChange={(e) => setDatos({ ...datos, declarado: e.target.checked })}
          />
          Ya declaró (no recibirá más correos ni contará en las alertas)
        </label>
        {error && <div className="error">{error}</div>}
        <div className="fila-botones">
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
