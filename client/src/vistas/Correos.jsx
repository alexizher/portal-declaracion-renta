import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';

export default function Correos() {
  const [clientes, setClientes] = useState([]);
  const [config, setConfig] = useState(null);
  const [seleccion, setSeleccion] = useState(new Set());
  const [preview, setPreview] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [soloSinEnviar, setSoloSinEnviar] = useState(false);

  async function cargar() {
    const [cli, cfg, his] = await Promise.all([
      api('/clientes'),
      api('/config'),
      api('/correos/historial'),
    ]);
    setClientes(cli);
    setConfig(cfg);
    setHistorial(his);
  }

  useEffect(() => {
    cargar().catch((e) => setError(e.message));
  }, []);

  const visibles = useMemo(
    () => (soloSinEnviar ? clientes.filter((c) => !c.ultimoEnvio) : clientes),
    [clientes, soloSinEnviar]
  );

  const listosParaEnvio = useMemo(
    () => visibles.filter((c) => c.email && c.vencimiento && c.plantillaId),
    [visibles]
  );

  function alternar(id) {
    const s = new Set(seleccion);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSeleccion(s);
  }

  function seleccionarTodos() {
    if (seleccion.size === listosParaEnvio.length) setSeleccion(new Set());
    else setSeleccion(new Set(listosParaEnvio.map((c) => c.id)));
  }

  async function guardarConfig() {
    await api('/config', { method: 'PUT', body: config });
  }

  async function verPreview(clienteId) {
    setPreview(await api(`/correos/previsualizar/${clienteId}`));
  }

  async function enviar() {
    const n = seleccion.size;
    if (!window.confirm(`Se enviarán ${n} correo(s) desde tu Gmail. ¿Continuar?`)) return;
    setEnviando(true);
    setError(null);
    setResultado(null);
    try {
      await guardarConfig();
      const { resultados } = await api('/correos/enviar', {
        method: 'POST',
        body: { clienteIds: [...seleccion] },
      });
      setResultado(resultados);
      setSeleccion(new Set());
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (!config) return <p className="tenue">Cargando…</p>;

  return (
    <section className="dos-columnas">
      <div>
        <div className="tarjeta">
          <h2>Mensaje</h2>
          <p className="tenue">
            Variables disponibles: {'{{nombre}}'}, {'{{vencimiento}}'}, {'{{digitos}}'},{' '}
            {'{{documentos}}'}, {'{{remitente}}'}
          </p>
          <label>
            Nombre del remitente (firma)
            <input
              value={config.remitente || ''}
              onChange={(e) => setConfig({ ...config, remitente: e.target.value })}
              onBlur={guardarConfig}
              placeholder="Ej: Alex — Contador"
            />
          </label>
          <label>
            Asunto
            <input
              value={config.asunto}
              onChange={(e) => setConfig({ ...config, asunto: e.target.value })}
              onBlur={guardarConfig}
            />
          </label>
          <label>
            Cuerpo (HTML)
            <textarea
              rows={12}
              value={config.cuerpo}
              onChange={(e) => setConfig({ ...config, cuerpo: e.target.value })}
              onBlur={guardarConfig}
            />
          </label>
        </div>

        {preview && (
          <div className="tarjeta">
            <h2>Vista previa</h2>
            <p>
              <strong>Para:</strong> {preview.para}
              <br />
              <strong>Asunto:</strong> {preview.asunto}
            </p>
            {preview.advertencias.length > 0 && (
              <div className="aviso">{preview.advertencias.join(' ')}</div>
            )}
            <div className="preview-html" dangerouslySetInnerHTML={{ __html: preview.html }} />
            <button onClick={() => setPreview(null)}>Cerrar vista previa</button>
          </div>
        )}
      </div>

      <div>
        <div className="tarjeta">
          <h2>Destinatarios</h2>
          <div className="fila-acciones">
            <label className="inline">
              <input
                type="checkbox"
                checked={soloSinEnviar}
                onChange={(e) => setSoloSinEnviar(e.target.checked)}
              />
              Solo sin envío previo
            </label>
            <button onClick={seleccionarTodos}>
              {seleccion.size === listosParaEnvio.length && listosParaEnvio.length > 0
                ? 'Quitar todos'
                : `Seleccionar listos (${listosParaEnvio.length})`}
            </button>
          </div>
          <div className="tabla-scroll" style={{ maxHeight: 320 }}>
            <table>
              <tbody>
                {visibles.map((c) => {
                  const listo = c.email && c.vencimiento && c.plantillaId;
                  return (
                    <tr key={c.id} className={listo ? '' : 'fila-tenue'}>
                      <td>
                        <input
                          type="checkbox"
                          disabled={!listo}
                          checked={seleccion.has(c.id)}
                          onChange={() => alternar(c.id)}
                        />
                      </td>
                      <td>
                        {c.nombre}
                        {!listo && (
                          <span className="pill alerta">
                            {!c.email ? 'sin correo' : !c.vencimiento ? 'sin fecha' : 'sin docs'}
                          </span>
                        )}
                      </td>
                      <td>{c.vencimiento?.fecha || '—'}</td>
                      <td>
                        <button onClick={() => verPreview(c.id)}>Ver</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {error && <div className="error">{error}</div>}
          <button
            className="primario grande"
            disabled={seleccion.size === 0 || enviando}
            onClick={enviar}
          >
            {enviando
              ? 'Enviando… (esto puede tardar, ~2 s por correo)'
              : `Enviar a ${seleccion.size} cliente(s)`}
          </button>
        </div>

        {resultado && (
          <div className="tarjeta">
            <h2>Resultado del envío</h2>
            <ul className="lista-resultado">
              {resultado.map((r) => (
                <li key={r.id} className={r.estado}>
                  <strong>{r.nombre}</strong> ({r.email || 'sin correo'}): {r.estado}
                  {r.error ? ` — ${r.error}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="tarjeta">
          <h2>Historial</h2>
          <div className="tabla-scroll" style={{ maxHeight: 240 }}>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((h) => (
                  <tr key={h.id}>
                    <td>{new Date(h.fecha).toLocaleString('es-CO')}</td>
                    <td>{h.nombre}</td>
                    <td>
                      <span className={`pill ${h.estado === 'enviado' ? 'ok' : 'alerta'}`}>
                        {h.estado}
                      </span>
                      {h.error && <div className="tenue">{h.error}</div>}
                    </td>
                  </tr>
                ))}
                {historial.length === 0 && (
                  <tr>
                    <td colSpan={3} className="tenue centrado">
                      Aún no se han enviado correos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
