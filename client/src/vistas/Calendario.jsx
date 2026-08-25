import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Calendario() {
  const [calendario, setCalendario] = useState([]);
  const [editado, setEditado] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    api('/calendario').then(setCalendario).catch((e) => setMensaje(e.message));
  }, []);

  function cambiarFecha(i, fecha) {
    const copia = [...calendario];
    copia[i] = { ...copia[i], fecha };
    setCalendario(copia);
    setEditado(true);
  }

  async function guardar() {
    await api('/calendario', { method: 'PUT', body: { calendario } });
    setEditado(false);
    setMensaje('Calendario guardado.');
  }

  return (
    <section>
      <div className="fila-acciones">
        <p className="tenue">
          Vencimientos DIAN para personas naturales, año gravable 2025 (según los dos últimos
          dígitos del documento, sin dígito de verificación). Verifica contra el{' '}
          <a
            href="https://www.dian.gov.co/Calendarios/Calendario_Tributario_2026.pdf"
            target="_blank"
            rel="noreferrer"
          >
            calendario oficial de la DIAN
          </a>{' '}
          y ajusta si es necesario.
        </p>
        <button className="primario" disabled={!editado} onClick={guardar}>
          Guardar cambios
        </button>
      </div>
      {mensaje && <div className="aviso">{mensaje}</div>}
      <div className="rejilla-calendario">
        {calendario.map((e, i) => (
          <div key={i} className="tarjeta compacta">
            <span className="pill">
              {e.digitos.map((d) => String(d).padStart(2, '0')).join(' - ')}
            </span>
            <input type="date" value={e.fecha} onChange={(ev) => cambiarFecha(i, ev.target.value)} />
          </div>
        ))}
      </div>
    </section>
  );
}
