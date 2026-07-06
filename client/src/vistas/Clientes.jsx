import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import ImportarExcel from './ImportarExcel.jsx';

const CLIENTE_VACIO = { nombre: '', email: '', cedula: '', telefono: '', plantillaId: '', notas: '' };

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState(null); // null | 'nuevo' | cliente
  const [importando, setImportando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

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
              <th>Nombre</th>
              <th>Cédula / NIT</th>
              <th>Correo</th>
              <th>Vence</th>
              <th>Documentos</th>
              <th>Último envío</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((c) => (
              <tr key={c.id}>
                <td>{c.nombre}</td>
                <td>{c.cedula}</td>
                <td>{c.email || <span className="tenue">sin correo</span>}</td>
                <td>
                  {c.vencimiento ? (
                    <span className="pill fecha">{c.vencimiento.fecha}</span>
                  ) : (
                    <span className="pill alerta">sin fecha</span>
                  )}
                </td>
                <td>{nombrePlantilla(c.plantillaId)}</td>
                <td>
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
            {filtrados.length === 0 && (
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
