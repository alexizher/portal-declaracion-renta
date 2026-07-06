const path = require('path');
const express = require('express');

const datos = require('./datos');
const { login, requiereAuth } = require('./auth');
const { vencimientoDe } = require('./vencimientos');
const { renderCorreo, enviarLote } = require('./correo');

const app = express();
app.use(express.json({ limit: '2mb' }));

const api = express.Router();
app.use('/api', api);

// Envuelve handlers async para que cualquier error termine en JSON y no
// tumbe el proceso.
const ruta = (fn) => (req, res) =>
  fn(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ error: err.message });
  });

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
  const { asunto, cuerpo, remitente } = req.body;
  res.json(await datos.guardarConfig({ asunto, cuerpo, remitente }));
}));

// ---------- Correos ----------

api.get('/correos/previsualizar/:clienteId', ruta(async (req, res) => {
  const cliente = await datos.obtenerCliente(req.params.clienteId);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });
  const [plantillas, config, calendario] = await Promise.all([
    datos.listarPlantillas(),
    datos.obtenerConfig(),
    datos.obtenerCalendario(),
  ]);
  const preview = renderCorreo(cliente, plantillas, config, calendario);
  res.json({
    para: cliente.email,
    asunto: preview.asunto,
    html: preview.html,
    advertencias: preview.advertencias,
  });
}));

api.post('/correos/enviar', ruta(async (req, res) => {
  const { clienteIds } = req.body;
  if (!Array.isArray(clienteIds) || clienteIds.length === 0) {
    return res.status(400).json({ error: 'Selecciona al menos un cliente.' });
  }
  res.json({ resultados: await enviarLote(clienteIds) });
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
