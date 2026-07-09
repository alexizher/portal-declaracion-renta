import React, { useEffect, useMemo, useState } from 'react';
import { api, apiArchivo } from '../api.js';

// Revisión de los documentos subidos por los clientes: ver cada archivo,
// aprobar o rechazar (con motivo) y enviar el resumen por correo.

const TEXTO_ESTADO = {
  pendiente: 'Sin subir',
  subido: 'En revisión',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

export default function Revision() {
  const [clientes, setClientes] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [resumen, setResumen] = useState([]);
  const [cliente, setCliente] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [rechazando, setRechazando] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [notificando, setNotificando] = useState(false);
  const [avisoEnvio, setAvisoEnvio] = useState(null);
  const [error, setError] = useState(null);
  const [copiado, setCopiado] = useState(false);

  async function cargar() {
    const [cli, pla, res] = await Promise.all([
      api('/clientes'),
      api('/plantillas'),
      api('/documentos/resumen'),
    ]);
    setClientes(cli);
    setPlantillas(pla);
    setResumen(res);
  }

  useEffect(() => {
    cargar().catch((e) => setError(e.message));
  }, []);

  const filas = useMemo(() => {
    const porCliente = new Map(resumen.map((r) => [r.clienteId, r]));
    return clientes
      .filter((c) => c.plantillaId)
      .map((c) => {
        const plantilla = plantillas.find((p) => p.id === c.plantillaId);
        const r = porCliente.get(c.id) || { subidos: 0, aprobados: 0, rechazados: 0, ultimo: null };
        return { cliente: c, total: plantilla ? plantilla.documentos.length : 0, ...r };
      });
  }, [clientes, plantillas, resumen]);

  async function abrir(c) {
    setError(null);
    setAvisoEnvio(null);
    setRechazando(null);
    setCliente(c);
    setDetalle(null);
    try {
      setDetalle(await api(`/clientes/${c.id}/documentos`));
    } catch (e) {
      setError(e.message);
    }
  }

  async function refrescar() {
    if (cliente) setDetalle(await api(`/clientes/${cliente.id}/documentos`));
    setResumen(await api('/documentos/resumen'));
  }

  async function revisar(doc, estado, motivoTexto) {
    setError(null);
    try {
      await api(`/documentos/${doc.documentoId}/revision`, {
        method: 'PUT',
        body: { estado, motivo: motivoTexto },
      });
      setRechazando(null);
      setMotivo('');
      await refrescar();
    } catch (e) {
      setError(e.message);
    }
  }

  // PDF e imágenes se abren en otra pestaña; el resto se descarga con su
  // nombre original.
  async function ver(doc) {
    setError(null);
    try {
      const blob = await apiArchivo(`/documentos/${doc.documentoId}/archivo`);
      const url = URL.createObjectURL(blob);
      if (doc.mime === 'application/pdf' || doc.mime.startsWith('image/')) {
        window.open(url, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.original;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      setError(e.message);
    }
  }

  async function copiarEnlace() {
    await navigator.clipboard.writeText(detalle.enlacePortal);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  async function notificar() {
    if (!window.confirm(`Se enviará a ${cliente.nombre} el resumen de la revisión. ¿Continuar?`)) {
      return;
    }
    setNotificando(true);
    setError(null);
    setAvisoEnvio(null);
    try {
      const r = await api(`/clientes/${cliente.id}/notificar-revision`, { method: 'POST' });
      setAvisoEnvio(
        r.estado === 'enviado'
          ? `Correo enviado a ${r.email}.`
          : `No se pudo enviar: ${r.error}`
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setNotificando(false);
    }
  }

  return (
    <section className="dos-columnas">
      <div>
        <div className="tarjeta">
          <h2>Clientes</h2>
          <p className="tenue">
            Documentos subidos desde el portal. Solo aparecen los clientes con plantilla asignada.
          </p>
          <div className="tabla-scroll" style={{ maxHeight: 480 }}>
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Aprobados</th>
                  <th>Por revisar</th>
                  <th className="oculta-movil">Rechazados</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.cliente.id} className={f.subidos > 0 ? '' : 'fila-tenue'}>
                    <td>{f.cliente.nombre}</td>
                    <td>
                      <span className={`pill ${f.aprobados === f.total && f.total > 0 ? 'aprobado' : ''}`}>
                        {f.aprobados}/{f.total}
                      </span>
                    </td>
                    <td>{f.subidos > 0 ? <span className="pill subido">{f.subidos}</span> : '—'}</td>
                    <td className="oculta-movil">
                      {f.rechazados > 0 ? <span className="pill rechazado">{f.rechazados}</span> : '—'}
                    </td>
                    <td>
                      <button onClick={() => abrir(f.cliente)}>Revisar</button>
                    </td>
                  </tr>
                ))}
                {filas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="tenue centrado">
                      Ningún cliente tiene plantilla de documentos asignada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        {!cliente && (
          <div className="tarjeta centrado tenue">
            Selecciona un cliente para revisar sus documentos.
          </div>
        )}

        {cliente && (
          <div className="tarjeta">
            <h2>{cliente.nombre}</h2>
            {error && <div className="error">{error}</div>}
            {avisoEnvio && <div className="aviso">{avisoEnvio}</div>}
            {!detalle && !error && <p className="tenue">Cargando…</p>}

            {detalle && (
              <>
                <div className="fila-acciones">
                  <button onClick={copiarEnlace}>
                    {copiado ? '¡Copiado!' : 'Copiar enlace del portal'}
                  </button>
                  <button className="primario" disabled={notificando} onClick={notificar}>
                    {notificando ? 'Enviando…' : 'Enviar resultado por correo'}
                  </button>
                </div>

                {detalle.checklist.map((d) => (
                  <div key={d.nombre} className="doc-revision">
                    <div className="portal-doc-info">
                      <p className="portal-doc-nombre">{d.nombre}</p>
                      <span className={`pill ${d.estado}`}>{TEXTO_ESTADO[d.estado]}</span>
                      {d.original && (
                        <p className="tenue portal-doc-archivo">
                          {d.original} — {(d.tamano / 1024 / 1024).toFixed(1)} MB —{' '}
                          {new Date(d.subidoEn).toLocaleString('es-CO')}
                        </p>
                      )}
                      {d.estado === 'rechazado' && d.motivo && (
                        <p className="aviso">Motivo: {d.motivo}</p>
                      )}
                    </div>

                    {d.documentoId && (
                      <div className="fila-botones">
                        <button onClick={() => ver(d)}>Ver</button>
                        {d.estado !== 'aprobado' && (
                          <button onClick={() => revisar(d, 'aprobado')}>Aprobar</button>
                        )}
                        {d.estado !== 'rechazado' && rechazando !== d.documentoId && (
                          <button className="peligro" onClick={() => setRechazando(d.documentoId)}>
                            Rechazar
                          </button>
                        )}
                        {(d.estado === 'aprobado' || d.estado === 'rechazado') && (
                          <button onClick={() => revisar(d, 'subido')}>Deshacer</button>
                        )}
                      </div>
                    )}

                    {d.documentoId && rechazando === d.documentoId && (
                      <div className="fila-acciones" style={{ marginTop: '0.5rem' }}>
                        <input
                          className="buscador"
                          placeholder="Motivo del rechazo (lo verá el cliente)"
                          value={motivo}
                          autoFocus
                          onChange={(e) => setMotivo(e.target.value)}
                        />
                        <button
                          className="peligro"
                          disabled={!motivo.trim()}
                          onClick={() => revisar(d, 'rechazado', motivo)}
                        >
                          Confirmar rechazo
                        </button>
                        <button onClick={() => setRechazando(null)}>Cancelar</button>
                      </div>
                    )}
                  </div>
                ))}

                {detalle.sinPlantilla && (
                  <p className="aviso">Este cliente ya no tiene plantilla asignada.</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
