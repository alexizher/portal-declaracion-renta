import { useState } from 'react';
import { CascaronLegal } from './Legal.jsx';

// /baja/{token}: enlace "darse de baja" de los correos de captación. Pide
// confirmar con un botón en vez de dar de baja al abrir la página, porque
// los filtros de seguridad del correo abren los enlaces solos.
export default function Baja({ token }) {
  const [estado, setEstado] = useState('inicio'); // inicio | enviando | listo | error
  const [error, setError] = useState(null);

  async function confirmar() {
    setEstado('enviando');
    try {
      const res = await fetch(`/api/portal/baja/${encodeURIComponent(token)}`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setEstado('listo');
    } catch (err) {
      setError(err.message);
      setEstado('error');
    }
  }

  return (
    <CascaronLegal titulo="Darse de baja">
      <div className="tarjeta legal-tarjeta">
        {estado === 'listo' ? (
          <>
            <h2>Listo, no le escribiremos más</h2>
            <p>
              Su correo quedó fuera de nuestra lista y no volverá a recibir mensajes sobre nuestros
              servicios. Si fue un error o más adelante necesita ayuda con su declaración, puede
              escribirnos por WhatsApp al 311 780 9709.
            </p>
          </>
        ) : (
          <>
            <h2>¿No desea recibir más correos?</h2>
            <p>
              Confirme y no volveremos a escribirle para ofrecerle nuestros servicios de
              declaración de renta.
            </p>
            {estado === 'error' && <div className="error">{error}</div>}
            <button className="primario grande" disabled={estado === 'enviando'} onClick={confirmar}>
              {estado === 'enviando' ? 'Procesando…' : 'Confirmar baja'}
            </button>
          </>
        )}
      </div>
    </CascaronLegal>
  );
}
