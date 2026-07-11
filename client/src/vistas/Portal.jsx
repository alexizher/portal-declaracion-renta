import React, { useEffect, useRef, useState } from 'react';

// Página de los clientes: llega por el enlace del correo, sin login.
// Muestra su checklist de documentos, permite subir cada archivo y agregar
// documentos adicionales con nombre propio (varios certificados de deudas,
// cuentas, vehículos, etc.).

const ESTADOS = {
  pendiente: { texto: 'Por subir', boton: 'Subir archivo' },
  subido: { texto: 'En revisión', boton: 'Reemplazar' },
  aprobado: { texto: 'Aprobado ✓', boton: null },
  rechazado: { texto: 'Corregir y subir de nuevo', boton: 'Subir corregido' },
};

const EJEMPLOS_EXTRA = [
  'Certificado de deuda de otra entidad',
  'Extracto de otra cuenta bancaria o tarjeta',
  'Billetera digital (Nequi, Daviplata…)',
  'Documentos de otro vehículo o activo',
];

// Cabecera y pie compartidos por todos los estados de la página (mismo estilo
// del panel de administración).
function Cascaron({ children }) {
  return (
    <div className="portal">
      <header className="barra portal-barra">
        <img src="/logo_DM.svg" alt="DM" className="logo" />
        <h1>
          Declaración de Renta
          <span className="portal-sub">Portal de documentos</span>
        </h1>
      </header>
      <main className="portal-cuerpo">{children}</main>
      <footer className="portal-pie-marca">
        <p>
          <strong>Daniela Molina Foronda</strong>
          <br />
          Contadora Pública · Asesora Tributaria
        </p>
        <p>Tel. 311 780 9709 · Año gravable 2025</p>
      </footer>
    </div>
  );
}

export default function Portal({ token }) {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [subiendo, setSubiendo] = useState(null);
  const [modalExtra, setModalExtra] = useState(false);
  const [nombreExtra, setNombreExtra] = useState('');
  const inputRef = useRef(null);
  const docPendiente = useRef(null); // { nombre, extra }

  async function cargar() {
    const res = await fetch(`/api/portal/${token}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    setInfo(data);
  }

  useEffect(() => {
    cargar().catch((e) => setError(e.message));
  }, []);

  function elegirArchivo(nombre, extra = false) {
    docPendiente.current = { nombre, extra };
    inputRef.current.value = '';
    inputRef.current.click();
  }

  async function subir(e) {
    const archivo = e.target.files[0];
    const pendiente = docPendiente.current;
    if (!archivo || !pendiente) return;
    setSubiendo(pendiente.nombre);
    setAviso(null);
    try {
      const cuerpo = new FormData();
      cuerpo.append('nombre', pendiente.nombre);
      if (pendiente.extra) cuerpo.append('extra', '1');
      cuerpo.append('archivo', archivo);
      const res = await fetch(`/api/portal/${token}/documentos`, {
        method: 'POST',
        body: cuerpo,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setModalExtra(false);
      setNombreExtra('');
      await cargar();
    } catch (err) {
      setAviso(err.message);
      if (pendiente.extra) setModalExtra(false);
    } finally {
      setSubiendo(null);
    }
  }

  if (error) {
    return (
      <Cascaron>
        <div className="tarjeta centrado">
          <p className="error">{error}</p>
          <p className="tenue">
            Verifica que abriste el enlace completo que te llegó por correo.
          </p>
        </div>
      </Cascaron>
    );
  }

  if (!info) {
    return (
      <Cascaron>
        <p className="tenue centrado" style={{ marginTop: '3rem' }}>Cargando…</p>
      </Cascaron>
    );
  }

  const aprobados = info.documentos.filter((d) => d.estado === 'aprobado').length;
  const total = info.documentos.length;
  const todoAprobado = total > 0 && aprobados === total;

  return (
    <Cascaron>
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
              {d.extra && <span className="pill extra">Adicional</span>}
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
                onClick={() => elegirArchivo(d.nombre, d.extra)}
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

      {total > 0 && (
        <div className="tarjeta portal-extra">
          <p className="portal-doc-nombre">¿Tienes otro documento que no está en la lista?</p>
          <p className="tenue">
            Por ejemplo: {EJEMPLOS_EXTRA.join(', ').toLowerCase()}.
          </p>
          <button onClick={() => setModalExtra(true)} disabled={subiendo !== null}>
            + Agregar otro documento
          </button>
        </div>
      )}

      {modalExtra && (
        <div className="modal-fondo" onClick={() => subiendo === null && setModalExtra(false)}>
          <form
            className="tarjeta modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              elegirArchivo(nombreExtra.trim(), true);
            }}
          >
            <h2>Agregar otro documento</h2>
            <p className="tenue">
              Escribe un nombre que nos diga qué es y de qué entidad, y luego elige el archivo.
            </p>
            <label>
              Nombre del documento *
              <input
                value={nombreExtra}
                autoFocus
                maxLength={120}
                placeholder="Ej: Certificado de deuda Bancolombia"
                onChange={(e) => setNombreExtra(e.target.value)}
              />
            </label>
            <div className="fila-botones">
              <button type="button" disabled={subiendo !== null} onClick={() => setModalExtra(false)}>
                Cancelar
              </button>
              <button type="submit" className="primario" disabled={nombreExtra.trim().length < 3 || subiendo !== null}>
                {subiendo !== null ? 'Subiendo…' : 'Elegir archivo y subir'}
              </button>
            </div>
          </form>
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
    </Cascaron>
  );
}
