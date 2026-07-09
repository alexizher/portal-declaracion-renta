import React, { useEffect, useRef, useState } from 'react';

// Página de los clientes: llega por el enlace del correo, sin login.
// Muestra su checklist de documentos y permite subir cada archivo.

const ESTADOS = {
  pendiente: { texto: 'Por subir', boton: 'Subir archivo' },
  subido: { texto: 'En revisión', boton: 'Reemplazar' },
  aprobado: { texto: 'Aprobado ✓', boton: null },
  rechazado: { texto: 'Corregir y subir de nuevo', boton: 'Subir corregido' },
};

export default function Portal({ token }) {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [subiendo, setSubiendo] = useState(null);
  const inputRef = useRef(null);
  const docPendiente = useRef(null);

  async function cargar() {
    const res = await fetch(`/api/portal/${token}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    setInfo(data);
  }

  useEffect(() => {
    cargar().catch((e) => setError(e.message));
  }, []);

  function elegirArchivo(nombre) {
    docPendiente.current = nombre;
    inputRef.current.value = '';
    inputRef.current.click();
  }

  async function subir(e) {
    const archivo = e.target.files[0];
    const nombre = docPendiente.current;
    if (!archivo || !nombre) return;
    setSubiendo(nombre);
    setAviso(null);
    try {
      const cuerpo = new FormData();
      cuerpo.append('nombre', nombre);
      cuerpo.append('archivo', archivo);
      const res = await fetch(`/api/portal/${token}/documentos`, {
        method: 'POST',
        body: cuerpo,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      await cargar();
    } catch (err) {
      setAviso(err.message);
    } finally {
      setSubiendo(null);
    }
  }

  if (error) {
    return (
      <div className="portal">
        <header className="portal-cabecera">
          <img src="/logo_DM.svg" alt="DM" className="logo" />
          <h1>Portal de documentos</h1>
        </header>
        <div className="tarjeta centrado">
          <p className="error">{error}</p>
          <p className="tenue">
            Verifica que abriste el enlace completo que te llegó por correo.
          </p>
        </div>
      </div>
    );
  }

  if (!info) return <p className="tenue centrado" style={{ marginTop: '3rem' }}>Cargando…</p>;

  const aprobados = info.documentos.filter((d) => d.estado === 'aprobado').length;
  const total = info.documentos.length;
  const todoAprobado = total > 0 && aprobados === total;

  return (
    <div className="portal">
      <header className="portal-cabecera">
        <img src="/logo_DM.svg" alt="DM" className="logo" />
        <h1>Portal de documentos</h1>
        <p>Declaración de renta — año gravable 2025</p>
      </header>

      <div className="tarjeta">
        <p>
          Hola, <strong>{info.nombre}</strong>.
        </p>
        {info.vencimiento && (
          <p>
            Tu declaración vence el <strong>{info.vencimiento.fechaTexto}</strong>.
          </p>
        )}
        <p className="tenue">
          Sube aquí cada documento de tu lista (PDF, foto o documento de Office, máx. 15 MB).
          Los revisaremos y te avisaremos por correo si algo necesita corrección.
        </p>
        <p>
          <span className={`pill ${todoAprobado ? 'aprobado' : 'subido'}`}>
            {aprobados} de {total} aprobados
          </span>
        </p>
        {todoAprobado && (
          <p className="pill aprobado">¡Listo! Todos tus documentos fueron aprobados.</p>
        )}
      </div>

      {aviso && <div className="error">{aviso}</div>}

      {info.documentos.map((d) => {
        const est = ESTADOS[d.estado] || ESTADOS.pendiente;
        return (
          <div key={d.nombre} className={`tarjeta portal-doc ${d.estado}`}>
            <div className="portal-doc-info">
              <p className="portal-doc-nombre">{d.nombre}</p>
              <span className={`pill ${d.estado}`}>{est.texto}</span>
              {d.original && (
                <p className="tenue portal-doc-archivo">
                  {d.original}
                  {d.subidoEn ? ` — ${new Date(d.subidoEn).toLocaleDateString('es-CO')}` : ''}
                </p>
              )}
              {d.estado === 'rechazado' && d.motivo && (
                <p className="aviso">Motivo: {d.motivo}</p>
              )}
            </div>
            {est.boton && (
              <button
                className="primario"
                disabled={subiendo !== null}
                onClick={() => elegirArchivo(d.nombre)}
              >
                {subiendo === d.nombre ? 'Subiendo…' : est.boton}
              </button>
            )}
          </div>
        );
      })}

      {total === 0 && (
        <div className="tarjeta centrado tenue">
          Aún no tienes una lista de documentos asignada. Escríbenos y la activamos.
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx"
        style={{ display: 'none' }}
        onChange={subir}
      />

      <p className="tenue centrado portal-pie">
        ¿Dudas? Responde al correo que te enviamos y con gusto te ayudamos.
      </p>
    </div>
  );
}
