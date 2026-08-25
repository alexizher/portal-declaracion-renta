import { useEffect, useState } from 'react';

// Recorrido guiado por los módulos: una tarjeta flotante avanza paso a paso
// mientras el panel muestra detrás la vista real de cada módulo. Se abre solo
// en el primer ingreso y con el botón "?" de la barra.

export const GUIA_VISTA_KEY = 'guia-vista';

const PASOS = [
  {
    id: 'clientes',
    titulo: 'Clientes',
    texto:
      'Aquí vive tu lista de clientes: impórtalos desde Excel/CSV o agrégalos uno a uno. A cada cliente se le asigna su lista de documentos y el sistema calcula solo la fecha de vencimiento DIAN según su cédula.',
  },
  {
    id: 'correos',
    titulo: 'Correos',
    texto:
      'Desde aquí envías dos tipos de mensaje: el recordatorio del vencimiento y la invitación al portal (con el enlace personal para subir documentos). Cada plantilla es editable, tiene vista previa y todo queda en el historial.',
  },
  {
    id: 'revision',
    titulo: 'Revisión',
    texto:
      'Cuando los clientes suben sus archivos al portal, aquí los revisas: ver o descargar cada documento, aprobarlo o rechazarlo con motivo, y al terminar enviarle el resumen por correo con un solo botón.',
  },
  {
    id: 'plantillas',
    titulo: 'Documentos',
    texto:
      'Las listas de documentos por perfil (empleado, independiente, con inversiones…). Lo que edites aquí es lo que verá cada cliente en su correo y en su portal.',
  },
  {
    id: 'calendario',
    titulo: 'Calendario DIAN',
    texto:
      'El calendario tributario con los vencimientos por los dos últimos dígitos de la cédula. Viene precargado con el calendario oficial y puedes ajustarlo si la DIAN cambia fechas.',
  },
];

export default function Guia({ onIrPestana, onCerrar }) {
  const [paso, setPaso] = useState(0);
  const [noMostrar, setNoMostrar] = useState(true);
  const actual = PASOS[paso];

  // La vista real del módulo se muestra detrás de la tarjeta.
  useEffect(() => {
    onIrPestana(actual.id);
  }, [paso]);

  function cerrar() {
    if (noMostrar) localStorage.setItem(GUIA_VISTA_KEY, '1');
    onIrPestana(PASOS[0].id);
    onCerrar();
  }

  return (
    <div className="guia">
      <div className="guia-progreso">
        {PASOS.map((p, i) => (
          <button
            key={p.id}
            className={i === paso ? 'activo' : ''}
            aria-label={p.titulo}
            onClick={() => setPaso(i)}
          />
        ))}
      </div>
      <h2>
        {actual.titulo}
        <span className="tenue"> · {paso + 1} de {PASOS.length}</span>
      </h2>
      <p>{actual.texto}</p>
      <label className="inline guia-no-mostrar">
        <input
          type="checkbox"
          checked={noMostrar}
          onChange={(e) => setNoMostrar(e.target.checked)}
        />
        No volver a mostrar esta guía
      </label>
      <div className="guia-botones">
        <button onClick={cerrar}>Omitir</button>
        <div>
          {paso > 0 && <button onClick={() => setPaso(paso - 1)}>Anterior</button>}
          {paso < PASOS.length - 1 ? (
            <button className="primario" onClick={() => setPaso(paso + 1)}>
              Siguiente
            </button>
          ) : (
            <button className="primario" onClick={cerrar}>
              ¡Listo!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
