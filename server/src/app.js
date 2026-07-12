const path = require('path');
const express = require('express');

const datos = require('./datos');
const { login, requiereAuth, clienteIdDelPortal } = require('./auth');
const { vencimientoDe } = require('./vencimientos');
const { renderCorreo, enviarLote, enviarRevision, enviarEnlacePortal, urlPortal, verificarEnvio } = require('./correo');
const { avisarSubida, revisarVencimientos } = require('./avisos');
const { turnstileSiteKey, verificarTurnstile } = require('./turnstile');
const { cifradoActivo, cifrar, descifrar } = require('./cifrado');
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

// Config pública para los formularios sin login (login del panel y
// recuperación del enlace): solo el site key de Turnstile, que es público.
portal.get('/publico/config', (req, res) => {
  res.json({ turnstile: turnstileSiteKey() });
});

// Reenvía al correo registrado el enlace personal del portal a partir de la
// cédula. La respuesta es siempre la misma exista o no el cliente (para no
// permitir adivinar cédulas), y hay freno de 15 minutos por cliente.
const RESPUESTA_RECUPERAR = {
  ok: true,
  mensaje:
    'Si tu cédula está registrada, en unos minutos te llegará el enlace al correo que tenemos guardado. Revisa también la carpeta de spam.',
};

portal.post('/recuperar', ruta(async (req, res) => {
  if (!(await verificarTurnstile(req.body.turnstile, req.ip))) {
    return res.status(400).json({ error: 'No pasaste la verificación anti-robots. Recarga la página e intenta de nuevo.' });
  }
  const cedula = String(req.body.cedula || '').replace(/\D/g, '');
  if (cedula.length < 5 || cedula.length > 15) {
    return res.status(400).json({ error: 'Escribe tu número de cédula (solo números, sin puntos).' });
  }

  const cliente = await datos.obtenerClientePorCedula(cedula);
  if (cliente && cliente.email) {
    const hace15min = new Date(Date.now() - 15 * 60000).toLocaleString('sv-SE', {
      timeZone: 'America/Bogota',
    });
    if (!(await datos.hayEnvioDesde('recuperacion', hace15min, cliente.id))) {
      await enviarEnlacePortal(cliente);
    }
  }
  res.json(RESPUESTA_RECUPERAR);
}));

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
    email: req.cliente.email,
    telefono: req.cliente.telefono,
    vencimiento: vencimientoDe(req.cliente.cedula, calendario),
    // La clave DIAN nunca viaja al portal: solo si ya está guardada y cuándo.
    dian: cifradoActivo()
      ? { guardada: Boolean(req.cliente.dianActualizado), fecha: req.cliente.dianActualizado }
      : null,
    // Documentos finales ya subidos por la contadora (el cliente los descarga).
    entregas: (await datos.listarEntregas(req.cliente.id)).map((e) => ({
      tipo: e.tipo,
      original: e.original,
      fecha: e.fecha,
    })),
    documentos: datos.armarChecklist(plantilla, documentos).map((d) => ({
      nombre: d.nombre,
      estado: d.estado,
      motivo: d.motivo,
      original: d.original,
      subidoEn: d.subidoEn,
      extra: d.extra,
    })),
  });
}));

// Subida (o reemplazo) de un documento del checklist. Con extra=1 el cliente
// puede subir un documento que no está en su lista, con el nombre que él
// mismo escribe (varios certificados de deudas, cuentas, vehículos, etc.).
const MAX_DOCS_POR_CLIENTE = 60;

portal.post('/:token/documentos', cargarClientePortal, subirArchivo, ruta(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo.' });
  const nombre = String(req.body.nombre || '').trim();
  const esExtra = req.body.extra === '1';

  const plantillas = await datos.listarPlantillas();
  const plantilla = plantillas.find((p) => p.id === req.cliente.plantillaId);
  if (!plantilla) {
    borrarArchivo(req.cliente.id, req.file.filename);
    return res.status(400).json({ error: 'Aún no tienes una lista de documentos asignada.' });
  }
  const enPlantilla = plantilla.documentos.includes(nombre);
  if (!enPlantilla && !esExtra) {
    borrarArchivo(req.cliente.id, req.file.filename);
    return res.status(400).json({ error: 'Ese documento no está en tu lista.' });
  }
  if (!enPlantilla && (nombre.length < 3 || nombre.length > 120)) {
    borrarArchivo(req.cliente.id, req.file.filename);
    return res
      .status(400)
      .json({ error: 'Dale al documento un nombre descriptivo (entre 3 y 120 caracteres).' });
  }

  const existentes = await datos.listarDocumentosDe(req.cliente.id);
  if (
    !existentes.some((d) => d.nombre === nombre) &&
    existentes.length >= MAX_DOCS_POR_CLIENTE
  ) {
    borrarArchivo(req.cliente.id, req.file.filename);
    return res.status(400).json({ error: 'Alcanzaste el máximo de documentos permitidos.' });
  }
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
  // Aviso interno a Daniela sin demorar la respuesta al cliente.
  avisarSubida(req.cliente).catch((err) => console.error('Aviso de subida:', err.message));
  res.status(201).json({ ok: true });
}));

// Descarga de los documentos finales (declaración presentada, anexo, recibo);
// lo único que el portal entrega al cliente, protegido por su token.
portal.get('/:token/entrega/:tipo', cargarClientePortal, ruta(async (req, res) => {
  const entregas = await datos.listarEntregas(req.cliente.id);
  const entrega = entregas.find((e) => e.tipo === req.params.tipo);
  if (!entrega) return res.status(404).json({ error: 'Ese documento aún no está disponible.' });
  res.download(rutaDe(req.cliente.id, entrega.archivo), entrega.original, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ error: 'El archivo no está en el disco del servidor.' });
    }
  });
}));

// El cliente actualiza su propio correo y teléfono (icono de lápiz).
portal.put('/:token/perfil', cargarClientePortal, ruta(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const telefono = String(req.body.telefono || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return res.status(400).json({ error: 'Escribe un correo electrónico válido.' });
  }
  if (telefono && !/^[\d\s+()-]{7,20}$/.test(telefono)) {
    return res.status(400).json({ error: 'Escribe un número de celular válido.' });
  }
  const cliente = await datos.actualizarPerfilPortal(req.cliente.id, { email, telefono });
  res.json({ ok: true, email: cliente.email, telefono: cliente.telefono });
}));

// El cliente deja su clave DIAN: se cifra al llegar y el portal jamás la
// devuelve (solo el panel autenticado puede leerla). Requiere DATA_SECRET.
portal.post('/:token/dian', cargarClientePortal, ruta(async (req, res) => {
  if (!cifradoActivo()) {
    return res.status(503).json({ error: 'Esta opción no está disponible por ahora.' });
  }
  const clave = String(req.body.clave || '');
  if (clave.length < 4 || clave.length > 100) {
    return res.status(400).json({ error: 'La clave debe tener entre 4 y 100 caracteres.' });
  }
  await datos.guardarClaveDian(req.cliente.id, cifrar(clave), datos.ahoraBogota());
  res.json({ ok: true });
}));

// ---------- Cron (sin login del panel) ----------

// Pensado para un cron de cPanel que haga curl una vez al día: dispara la
// alerta de vencimientos y de paso despierta la app si Passenger la durmió.
// Protegido con CRON_SECRET del .env; sin esa variable queda deshabilitado.
// Va en el router api pero registrado ANTES de requiereAuth.
api.get('/cron/alertas', ruta(async (req, res) => {
  const clave = process.env.CRON_SECRET;
  if (!clave || req.query.clave !== clave) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  res.json(await revisarVencimientos({ ignorarHorario: true }));
}));

api.post('/login', ruta(async (req, res) => {
  if (!(await verificarTurnstile(req.body.turnstile, req.ip))) {
    return res.status(400).json({ error: 'No pasaste la verificación anti-robots. Recarga la página e intenta de nuevo.' });
  }
  const resultado = login(req.body.password);
  if (resultado.error) return res.status(401).json(resultado);
  res.json(resultado);
}));

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
  const {
    asunto,
    cuerpo,
    asunto_portal,
    cuerpo_portal,
    asunto_novedades,
    cuerpo_novedades,
    remitente,
    correo_avisos,
  } = req.body;
  res.json(
    await datos.guardarConfig({
      asunto,
      cuerpo,
      asunto_portal,
      cuerpo_portal,
      asunto_novedades,
      cuerpo_novedades,
      remitente,
      correo_avisos,
    })
  );
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
    dian: { guardada: Boolean(cliente.dianActualizado), fecha: cliente.dianActualizado },
    entregas: (await datos.listarEntregas(cliente.id)).map((e) => ({
      tipo: e.tipo,
      original: e.original,
      fecha: e.fecha,
    })),
    declarado: cliente.declarado,
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

// Clave DIAN del cliente: solo el panel autenticado puede descifrarla, y se
// puede borrar cuando ya no haga falta (minimizar datos sensibles).
api.get('/clientes/:id/dian', ruta(async (req, res) => {
  const cifrada = await datos.obtenerClaveDianCifrada(req.params.id);
  if (!cifrada) return res.status(404).json({ error: 'El cliente aún no ha registrado su clave.' });
  if (!cifradoActivo()) {
    return res.status(503).json({ error: 'Falta DATA_SECRET en el servidor.' });
  }
  try {
    res.json({ clave: descifrar(cifrada) });
  } catch {
    res.status(500).json({ error: 'No se pudo descifrar (¿cambió DATA_SECRET?). Pide al cliente registrarla de nuevo.' });
  }
}));

api.delete('/clientes/:id/dian', ruta(async (req, res) => {
  await datos.borrarClaveDian(req.params.id);
  res.json({ ok: true });
}));

// ---------- Entregas (documentos finales que sube Daniela) ----------

// tipos: declaracion | anexo | recibo. Subir la declaración marca al cliente
// como "ya declaró". El multer usa req.clienteId para elegir la carpeta.
function validarTipoEntrega(req, res, next) {
  if (!datos.TIPOS_ENTREGA.includes(req.params.tipo)) {
    return res.status(400).json({ error: 'Tipo de documento inválido.' });
  }
  next();
}

api.post(
  '/clientes/:id/entrega/:tipo',
  validarTipoEntrega,
  (req, res, next) => {
    req.clienteId = req.params.id;
    next();
  },
  subirArchivo,
  ruta(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo.' });
    const cliente = await datos.obtenerCliente(req.params.id);
    if (!cliente) {
      borrarArchivo(req.params.id, req.file.filename);
      return res.status(404).json({ error: 'Cliente no encontrado.' });
    }
    const r = await datos.guardarEntrega(req.params.id, req.params.tipo, {
      archivo: req.file.filename,
      original: nombreOriginal(req.file),
      fecha: datos.ahoraBogota(),
    });
    if (r.anterior) borrarArchivo(req.params.id, r.anterior);
    res.status(201).json({ ok: true, entregas: await datos.listarEntregas(req.params.id) });
  })
);

// Descarga desde el panel (para revisar qué se le subió al cliente).
api.get('/clientes/:id/entrega/:tipo', validarTipoEntrega, ruta(async (req, res) => {
  const entregas = await datos.listarEntregas(req.params.id);
  const entrega = entregas.find((e) => e.tipo === req.params.tipo);
  if (!entrega) return res.status(404).json({ error: 'No hay archivo subido de ese tipo.' });
  res.download(rutaDe(req.params.id, entrega.archivo), entrega.original, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ error: 'El archivo no está en el disco del servidor.' });
    }
  });
}));

api.delete('/clientes/:id/entrega/:tipo', validarTipoEntrega, ruta(async (req, res) => {
  const r = await datos.borrarEntrega(req.params.id, req.params.tipo);
  if (r && r.anterior) borrarArchivo(req.params.id, r.anterior);
  res.json({ ok: true, entregas: await datos.listarEntregas(req.params.id) });
}));

// ---------- Correos ----------

const TIPOS_MENSAJE = ['recordatorio', 'portal', 'novedades'];

api.get('/correos/previsualizar/:clienteId', ruta(async (req, res) => {
  const tipo = TIPOS_MENSAJE.includes(req.query.tipo) ? req.query.tipo : 'recordatorio';
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
    resultados: await enviarLote(clienteIds, TIPOS_MENSAJE.includes(tipo) ? tipo : 'recordatorio'),
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
