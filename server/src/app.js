const path = require('path');
const express = require('express');

const datos = require('./datos');
const { login, requiereAuth, clienteIdDelPortal } = require('./auth');
const { vencimientoDe } = require('./vencimientos');
const { renderCorreo, enviarLote, enviarRevision, urlPortal, verificarEnvio } = require('./correo');
const {
  rutaDe,
  borrarArchivo,
  borrarCarpetaCliente,
  subirArchivo,
  nombreOriginal,
} = require('./archivos');

const app = express();
app.use(express.json({ limit: '2mb' }));

// El portal de clientes va registrado ANTES que /api: usa el token del enlace
// en lugar del login del panel. Lo que no coincida con sus rutas cae al
// router /api y termina en el 401 de requiereAuth.
const portal = express.Router();
app.use('/api/portal', portal);

const api = express.Router();
app.use('/api', api);

// Envuelve handlers async para que cualquier error termine en JSON y no
// tumbe el proceso.
const ruta = (fn) => (req, res) =>
  fn(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ error: err.message });
  });

// ---------- Portal de clientes (Fase 2, sin login) ----------

// Resuelve el token del enlace a un cliente y lo deja en req.cliente.
function cargarClientePortal(req, res, next) {
  (async () => {
    const clienteId = clienteIdDelPortal(req.params.token);
    const cliente = clienteId && (await datos.obtenerCliente(clienteId));
    if (!cliente) return res.status(404).json({ error: 'Este enlace no es válido.' });
    req.cliente = cliente;
    req.clienteId = cliente.id; // lo usa multer para elegir la carpeta
    next();
  })().catch((err) => {
    console.error(err);
    res.status(500).json({ error: err.message });
  });
}

// Estado del checklist del cliente (solo lo que él necesita ver).
portal.get('/:token', cargarClientePortal, ruta(async (req, res) => {
  const [plantillas, calendario, documentos] = await Promise.all([
    datos.listarPlantillas(),
    datos.obtenerCalendario(),
    datos.listarDocumentosDe(req.cliente.id),
  ]);
  const plantilla = plantillas.find((p) => p.id === req.cliente.plantillaId);
  res.json({
    nombre: req.cliente.nombre,
    vencimiento: vencimientoDe(req.cliente.cedula, calendario),
    documentos: datos.armarChecklist(plantilla, documentos).map((d) => ({
      nombre: d.nombre,
      estado: d.estado,
      motivo: d.motivo,
      original: d.original,
      subidoEn: d.subidoEn,
    })),
  });
}));

// Subida (o reemplazo) de un documento del checklist.
portal.post('/:token/documentos', cargarClientePortal, subirArchivo, ruta(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo.' });
  const nombre = String(req.body.nombre || '');

  const plantillas = await datos.listarPlantillas();
  const plantilla = plantillas.find((p) => p.id === req.cliente.plantillaId);
  if (!plantilla || !plantilla.documentos.includes(nombre)) {
    borrarArchivo(req.cliente.id, req.file.filename);
    return res.status(400).json({ error: 'Ese documento no está en tu lista.' });
  }

  const existentes = await datos.listarDocumentosDe(req.cliente.id);
  const previo = existentes.find((d) => d.nombre === nombre);
  if (previo && previo.estado === 'aprobado') {
    borrarArchivo(req.cliente.id, req.file.filename);
    return res
      .status(409)
      .json({ error: 'Este documento ya fue aprobado; no es necesario volver a subirlo.' });
  }

  const { archivoAnterior } = await datos.guardarDocumento({
    clienteId: req.cliente.id,
    nombre,
    archivo: req.file.filename,
    original: nombreOriginal(req.file),
    mime: req.file.mimetype,
    tamano: req.file.size,
    fecha: datos.ahoraBogota(),
  });
  if (archivoAnterior) borrarArchivo(req.cliente.id, archivoAnterior);
  res.status(201).json({ ok: true });
}));

api.post('/login', (req, res) => {
  const resultado = login(req.body.password);
  if (resultado.error) return res.status(401).json(resultado);
  res.json(resultado);
});

api.use(requiereAuth);

// ---------- Clientes ----------

api.get('/clientes', ruta(async (req, res) => {
  const [clientes, calendario] = await Promise.all([
    datos.listarClientes(),
    datos.obtenerCalendario(),
  ]);
  res.json(
    clientes.map((c) => ({ ...c, vencimiento: vencimientoDe(c.cedula, calendario) }))
  );
}));

api.post('/clientes', ruta(async (req, res) => {
  const { nombre, cedula } = req.body;
  if (!nombre || !cedula) {
    return res.status(400).json({ error: 'Nombre y cédula son obligatorios.' });
  }
  try {
    const cliente = await datos.crearCliente(req.body);
    const calendario = await datos.obtenerCalendario();
    res.status(201).json({ ...cliente, vencimiento: vencimientoDe(cliente.cedula, calendario) });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe un cliente con esa cédula.' });
    }
    throw err;
  }
}));

// Importación masiva desde Excel/CSV (el frontend parsea y envía JSON).
api.post('/clientes/importar', ruta(async (req, res) => {
  const { filas, plantillaId } = req.body;
  if (!Array.isArray(filas)) {
    return res.status(400).json({ error: 'Se esperaba un arreglo de filas.' });
  }
  res.json(await datos.importarClientes(filas, plantillaId));
}));

api.put('/clientes/:id', ruta(async (req, res) => {
  const cliente = await datos.actualizarCliente(req.params.id, req.body);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });
  const calendario = await datos.obtenerCalendario();
  res.json({ ...cliente, vencimiento: vencimientoDe(cliente.cedula, calendario) });
}));

api.delete('/clientes/:id', ruta(async (req, res) => {
  const ok = await datos.eliminarCliente(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Cliente no encontrado.' });
  borrarCarpetaCliente(req.params.id);
  res.json({ ok: true });
}));

// ---------- Plantillas de documentos ----------

api.get('/plantillas', ruta(async (req, res) => {
  res.json(await datos.listarPlantillas());
}));

api.post('/plantillas', ruta(async (req, res) => {
  if (!req.body.nombre) {
    return res.status(400).json({ error: 'El nombre es obligatorio.' });
  }
  res.status(201).json(await datos.crearPlantilla(req.body));
}));

api.put('/plantillas/:id', ruta(async (req, res) => {
  const plantilla = await datos.actualizarPlantilla(req.params.id, req.body);
  if (!plantilla) return res.status(404).json({ error: 'Plantilla no encontrada.' });
  res.json(plantilla);
}));

api.delete('/plantillas/:id', ruta(async (req, res) => {
  const ok = await datos.eliminarPlantilla(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Plantilla no encontrada.' });
  res.json({ ok: true });
}));

// ---------- Calendario de vencimientos ----------

api.get('/calendario', ruta(async (req, res) => {
  res.json(await datos.obtenerCalendario());
}));

api.put('/calendario', ruta(async (req, res) => {
  const { calendario } = req.body;
  if (!Array.isArray(calendario)) {
    return res.status(400).json({ error: 'Formato inválido.' });
  }
  await datos.guardarCalendario(calendario);
  res.json({ ok: true });
}));

// ---------- Configuración del correo ----------

api.get('/config', ruta(async (req, res) => {
  res.json(await datos.obtenerConfig());
}));

api.put('/config', ruta(async (req, res) => {
  const { asunto, cuerpo, asunto_portal, cuerpo_portal, remitente } = req.body;
  res.json(await datos.guardarConfig({ asunto, cuerpo, asunto_portal, cuerpo_portal, remitente }));
}));

// ---------- Revisión de documentos (Fase 2) ----------

// Conteos por cliente; el frontend los cruza con la lista de clientes.
api.get('/documentos/resumen', ruta(async (req, res) => {
  res.json(await datos.resumenDocumentos());
}));

// Checklist completo de un cliente + su enlace del portal.
api.get('/clientes/:id/documentos', ruta(async (req, res) => {
  const cliente = await datos.obtenerCliente(req.params.id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });
  const [plantillas, documentos] = await Promise.all([
    datos.listarPlantillas(),
    datos.listarDocumentosDe(cliente.id),
  ]);
  const plantilla = plantillas.find((p) => p.id === cliente.plantillaId);
  res.json({
    checklist: datos.armarChecklist(plantilla, documentos),
    enlacePortal: process.env.BASE_URL
      ? urlPortal(cliente.id)
      : `${req.protocol}://${req.get('host')}${urlPortal(cliente.id)}`,
    sinPlantilla: !plantilla,
  });
}));

// Descarga del archivo (el panel lo pide con fetch + Authorization).
api.get('/documentos/:id/archivo', ruta(async (req, res) => {
  const doc = await datos.obtenerDocumento(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Documento no encontrado.' });
  res.download(rutaDe(doc.clienteId, doc.archivo), doc.original, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ error: 'El archivo no está en el disco del servidor.' });
    }
  });
}));

// Aprobar / rechazar (o volver a "subido" para deshacer una revisión).
api.put('/documentos/:id/revision', ruta(async (req, res) => {
  const { estado, motivo } = req.body;
  if (!['aprobado', 'rechazado', 'subido'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido.' });
  }
  if (estado === 'rechazado' && !String(motivo || '').trim()) {
    return res.status(400).json({ error: 'Indica el motivo del rechazo.' });
  }
  const doc = await datos.revisarDocumento(req.params.id, {
    estado,
    motivo: estado === 'rechazado' ? String(motivo).trim() : null,
    fecha: datos.ahoraBogota(),
  });
  if (!doc) return res.status(404).json({ error: 'Documento no encontrado.' });
  res.json(doc);
}));

// Envía al cliente el resumen de la revisión.
api.post('/clientes/:id/notificar-revision', ruta(async (req, res) => {
  res.json(await enviarRevision(req.params.id));
}));

// ---------- Correos ----------

api.get('/correos/previsualizar/:clienteId', ruta(async (req, res) => {
  const tipo = req.query.tipo === 'portal' ? 'portal' : 'recordatorio';
  const cliente = await datos.obtenerCliente(req.params.clienteId);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });
  const [plantillas, config, calendario] = await Promise.all([
    datos.listarPlantillas(),
    datos.obtenerConfig(),
    datos.obtenerCalendario(),
  ]);
  const preview = renderCorreo(cliente, plantillas, config, calendario, tipo);
  res.json({
    para: cliente.email,
    asunto: preview.asunto,
    html: preview.html,
    advertencias: preview.advertencias,
  });
}));

// Diagnóstico: prueba la conexión con el servidor SMTP configurado sin
// enviar ningún correo.
api.get('/correos/verificar', ruta(async (req, res) => {
  try {
    res.json({ ok: true, detalle: await verificarEnvio() });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
}));

api.post('/correos/enviar', ruta(async (req, res) => {
  const { clienteIds, tipo } = req.body;
  if (!Array.isArray(clienteIds) || clienteIds.length === 0) {
    return res.status(400).json({ error: 'Selecciona al menos un cliente.' });
  }
  res.json({
    resultados: await enviarLote(clienteIds, tipo === 'portal' ? 'portal' : 'recordatorio'),
  });
}));

api.get('/correos/historial', ruta(async (req, res) => {
  res.json(await datos.listarEnvios(500));
}));

// ---------- Frontend (SPA compilada) ----------

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
app.use(express.static(PUBLIC_DIR));
app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'), (err) => {
    if (err) res.status(404).send('Frontend no compilado. Ejecuta npm run build en /client.');
  });
});

module.exports = app;
