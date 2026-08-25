import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Plantillas() {
  const [plantillas, setPlantillas] = useState([]);
  const [mensaje, setMensaje] = useState(null);

  async function cargar() {
    setPlantillas(await api('/plantillas'));
  }

  useEffect(() => {
    cargar().catch((e) => setMensaje(e.message));
  }, []);

  async function crear() {
    const nombre = window.prompt('Nombre de la nueva lista de documentos:');
    if (!nombre) return;
    await api('/plantillas', { method: 'POST', body: { nombre, documentos: [] } });
    cargar();
  }

  async function eliminar(p) {
    if (!window.confirm(`¿Eliminar la lista "${p.nombre}"?`)) return;
    await api(`/plantillas/${p.id}`, { method: 'DELETE' });
    cargar();
  }

  return (
    <section>
      <div className="fila-acciones">
        <p className="tenue">
          Cada cliente tiene asignada una de estas listas; es la que se incluye en su correo.
          Escribe un documento por línea.
        </p>
        <button className="primario" onClick={crear}>
          + Nueva lista
        </button>
      </div>
      {mensaje && <div className="aviso">{mensaje}</div>}
      <div className="rejilla">
        {plantillas.map((p) => (
          <EditorPlantilla key={p.id} plantilla={p} onEliminar={() => eliminar(p)} />
        ))}
      </div>
    </section>
  );
}

function EditorPlantilla({ plantilla, onEliminar }) {
  const [nombre, setNombre] = useState(plantilla.nombre);
  const [texto, setTexto] = useState(plantilla.documentos.join('\n'));
  const [estado, setEstado] = useState('guardado'); // guardado | editado | guardando

  async function guardar() {
    setEstado('guardando');
    await api(`/plantillas/${plantilla.id}`, {
      method: 'PUT',
      body: {
        nombre,
        documentos: texto
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
      },
    });
    setEstado('guardado');
  }

  return (
    <div className="tarjeta">
      <input
        className="titulo-plantilla"
        value={nombre}
        onChange={(e) => {
          setNombre(e.target.value);
          setEstado('editado');
        }}
      />
      <textarea
        rows={10}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setEstado('editado');
        }}
      />
      <div className="fila-botones">
        <button className="peligro" onClick={onEliminar}>
          Eliminar
        </button>
        <button className="primario" disabled={estado !== 'editado'} onClick={guardar}>
          {estado === 'guardando' ? 'Guardando…' : estado === 'guardado' ? 'Guardado ✓' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
