import React, { useEffect, useRef, useState } from 'react';

// Página de los clientes: llega por el enlace del correo, sin login.
// El checklist se agrupa por estado (corregir → por subir → en revisión →
// aprobados) con barra de progreso; en escritorio los documentos van en
// cuadrícula y en celular en lista. Permite además subir documentos
// adicionales con nombre propio.

const ESTADOS = {
  pendiente: { texto: 'Por subir', boton: 'Subir archivo', icono: 'subir' },
  subido: { texto: 'En revisión', boton: 'Reemplazar', icono: 'reloj' },
  aprobado: { texto: 'Aprobado', boton: null, icono: 'check' },
  rechazado: { texto: 'Para corregir', boton: 'Subir corregido', icono: 'alerta' },
};

// Iconos SVG inline (trazo 2, estilo Lucide) para no depender de librerías.
function Icono({ tipo, tam = 20 }) {
  const comunes = {
    width: tam,
    height: tam,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };
  if (tipo === 'subir') {
    return (
      <svg {...comunes}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    );
  }
  if (tipo === 'reloj') {
    return (
      <svg {...comunes}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    );
  }
  if (tipo === 'check') {
    return (
      <svg {...comunes}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    );
  }
  if (tipo === 'alerta') {
    return (
      <svg {...comunes}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );
  }
  if (tipo === 'mas') {
    return (
      <svg {...comunes}>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    );
  }
  return null;
}

// Días entre hoy y la fecha ISO del vencimiento (negativo si ya pasó).
function diasHasta(fechaIso) {
  const [y, m, d] = fechaIso.split('-').map(Number);
  const hoy = new Date();
  return Math.round(
    (Date.UTC(y, m - 1, d) - Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) / 86400000
  );
}

function chipVencimiento(fechaIso) {
  const dias = diasHasta(fechaIso);
  if (dias < 0) return { clase: 'vencido', texto: 'Plazo vencido' };
  if (dias === 0) return { clase: 'f0', texto: '¡Vence hoy!' };
  if (dias <= 3) return { clase: 'f3', texto: `Faltan ${dias} días` };
  if (dias <= 8) return { clase: 'f8', texto: `Faltan ${dias} días` };
  if (dias <= 15) return { clase: 'f15', texto: `Faltan ${dias} días` };
  return null; // lejos: la fecha en el texto basta
}

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

function TarjetaDoc({ doc, subiendo, onElegir }) {
  const est = ESTADOS[doc.estado] || ESTADOS.pendiente;
  const ocupado = subiendo !== null;
  return (
    <div className={`tarjeta portal-doc ${doc.estado}`}>
      <div className="portal-doc-cab">
        <span className={`portal-doc-icono ${doc.estado}`}>
          <Icono tipo={est.icono} />
        </span>
        <span className={`pill ${doc.estado}`}>{est.texto}</span>
        {doc.extra && <span className="pill extra">Adicional</span>}
      </div>
      <p className="portal-doc-nombre">{doc.nombre}</p>
      {doc.original && (
        <p className="tenue portal-doc-archivo">
          {doc.original}
          {doc.subidoEn ? ` — ${new Date(doc.subidoEn).toLocaleDateString('es-CO')}` : ''}
        </p>
      )}
      {doc.estado === 'rechazado' && doc.motivo && <p className="aviso">Motivo: {doc.motivo}</p>}
      {est.boton && (
        <button
          className={`portal-boton-doc ${doc.estado === 'rechazado' ? 'primario' : ''}`}
          disabled={ocupado}
          onClick={() => onElegir(doc.nombre, doc.extra)}
        >
          {subiendo === doc.nombre ? (
            <span className="spinner" aria-hidden />
          ) : (
            <Icono tipo="subir" tam={17} />
          )}
          {subiendo === doc.nombre ? 'Subiendo…' : est.boton}
        </button>
      )}
    </div>
  );
}

function Seccion({ titulo, docs, subiendo, onElegir }) {
  if (!docs.length) return null;
  return (
    <section>
      <h2 className="portal-seccion-titulo">
        {titulo} <span className="portal-seccion-n">{docs.length}</span>
      </h2>
      <div className="portal-grid">
        {docs.map((d) => (
          <TarjetaDoc key={d.nombre} doc={d} subiendo={subiendo} onElegir={onElegir} />
        ))}
      </div>
    </section>
  );
}

export default function Portal({ token }) {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [toast, setToast] = useState(null);
  const [subiendo, setSubiendo] = useState(null);
  const [modalExtra, setModalExtra] = useState(false);
  const [nombreExtra, setNombreExtra] = useState('');
  const inputRef = useRef(null);
  const docPendiente = useRef(null); // { nombre, extra }
  const toastTimer = useRef(null);

  async function cargar() {
    const res = await fetch(`/api/portal/${token}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    setInfo(data);
  }

  useEffect(() => {
    cargar().catch((e) => setError(e.message));
    return () => clearTimeout(toastTimer.current);
  }, []);

  function avisarExito(mensaje) {
    setToast(mensaje);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }

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
      avisarExito('Documento recibido. Lo revisaremos y te avisamos por correo.');
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

  const docs = info.documentos;
  const rechazados = docs.filter((d) => d.estado === 'rechazado');
  const pendientes = docs.filter((d) => d.estado === 'pendiente');
  const enRevision = docs.filter((d) => d.estado === 'subido');
  const aprobados = docs.filter((d) => d.estado === 'aprobado');
  const total = docs.length;
  const todoAprobado = total > 0 && aprobados.length === total;
  const porcentaje = total > 0 ? Math.round((aprobados.length / total) * 100) : 0;
  const chip = info.vencimiento ? chipVencimiento(info.vencimiento.fecha) : null;

  return (
    <Cascaron>
      <div className="tarjeta portal-resumen">
        <p className="portal-hola">
          Hola, <strong>{info.nombre}</strong>.
        </p>
        {info.vencimiento && (
          <p>
            Tu declaración vence el <strong>{info.vencimiento.fechaTexto}</strong>
            {chip && (
              <>
                {' '}
                <span className={`pill ${chip.clase}`}>{chip.texto}</span>
              </>
            )}
          </p>
        )}
        <p className="tenue">
          Sube cada documento de tu lista (PDF, foto o documento de Office, máx. 15 MB). Los
          revisaremos y te avisaremos por correo si algo necesita corrección.
        </p>

        {total > 0 && (
          <>
            <div
              className="progreso"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={aprobados.length}
              aria-label={`${aprobados.length} de ${total} documentos aprobados`}
            >
              <div className="progreso-relleno" style={{ width: `${porcentaje}%` }} />
            </div>
            <div className="portal-conteos">
              <span className="portal-conteo">
                <strong>{aprobados.length}</strong> de <strong>{total}</strong> aprobados
              </span>
              {enRevision.length > 0 && (
                <span className="pill subido">{enRevision.length} en revisión</span>
              )}
              {rechazados.length > 0 && (
                <span className="pill rechazado">{rechazados.length} por corregir</span>
              )}
              {pendientes.length > 0 && (
                <span className="pill pendiente">{pendientes.length} por subir</span>
              )}
            </div>
          </>
        )}
        {todoAprobado && (
          <p className="pill aprobado portal-listo">
            ¡Listo! Todos tus documentos fueron aprobados.
          </p>
        )}
      </div>

      {aviso && <div className="error" role="alert">{aviso}</div>}

      <Seccion
        titulo="Necesitan corrección"
        docs={rechazados}
        subiendo={subiendo}
        onElegir={elegirArchivo}
      />
      <Seccion titulo="Por subir" docs={pendientes} subiendo={subiendo} onElegir={elegirArchivo} />
      <Seccion
        titulo="En revisión"
        docs={enRevision}
        subiendo={subiendo}
        onElegir={elegirArchivo}
      />

      {aprobados.length > 0 && (
        <section>
          <h2 className="portal-seccion-titulo">
            Aprobados <span className="portal-seccion-n">{aprobados.length}</span>
          </h2>
          <div className="tarjeta portal-aprobados">
            {aprobados.map((d) => (
              <div key={d.nombre} className="portal-aprobado-fila">
                <span className="portal-doc-icono aprobado">
                  <Icono tipo="check" tam={18} />
                </span>
                <div>
                  <p className="portal-doc-nombre">{d.nombre}</p>
                  {d.original && <p className="tenue portal-doc-archivo">{d.original}</p>}
                </div>
                {d.extra && <span className="pill extra">Adicional</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {total === 0 && (
        <div className="tarjeta centrado tenue">
          Aún no tienes una lista de documentos asignada. Escríbenos y la activamos.
        </div>
      )}

      {total > 0 && (
        <div className="tarjeta portal-extra">
          <p className="portal-doc-nombre">¿Tienes otro documento que no está en la lista?</p>
          <p className="tenue">
            Por ejemplo: certificados de deudas de otras entidades, extractos de otras cuentas o
            tarjetas, billeteras digitales (Nequi, Daviplata…) u otro vehículo o activo.
          </p>
          <button
            className="portal-boton-doc"
            onClick={() => setModalExtra(true)}
            disabled={subiendo !== null}
          >
            <Icono tipo="mas" tam={17} /> Agregar otro documento
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
              <button
                type="button"
                disabled={subiendo !== null}
                onClick={() => setModalExtra(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="primario"
                disabled={nombreExtra.trim().length < 3 || subiendo !== null}
              >
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

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <Icono tipo="check" tam={18} /> {toast}
        </div>
      )}

      <p className="tenue centrado portal-pie">
        ¿Dudas? Responde al correo que te enviamos y con gusto te ayudamos.
      </p>
    </Cascaron>
  );
}
