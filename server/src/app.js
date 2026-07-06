const path = require('path');
const express = require('express');

const { load, save, nuevoId } = require('./store');
const { seedSiFalta } = require('./seed');
const { login, requiereAuth } = require('./auth');
const { vencimientoDe } = require('./vencimientos');
const { renderCorreo, enviarLote } = require('./correo');

seedSiFalta();

const app = express();
app.use(express.json({ limit: '2mb' }));

const api = express.Router();
app.use('/api', api);

api.post('/login', (req, res) => {
  const resultado = login(req.body.password);
  if (resultado.error) return res.status(401).json(resultado);
  res.json(resultado);
});

api.use(requiereAuth);

// ---------- Clientes ----------

function conVencimiento(cliente) {
  return { ...cliente, vencimiento: vencimientoDe(cliente.cedula) };
}

api.get('/clientes', (req, res) => {
  res.json(load('clientes', []).map(conVencimiento));
});

api.post('/clientes', (req, res) => {
  const { nombre, email, cedula, telefono, plantillaId, notas } = req.body;
  if (!nombre || !cedula) {
    return res.status(400).json({ error: 'Nombre y cédula son obligatorios.' });
  }
  const clientes = load('clientes', []);
  const cliente = {
    id: nuevoId(),
    nombre: String(nombre).trim(),
    email: String(email || '').trim().toLowerCase(),
    cedula: String(cedula).trim(),
    telefono: String(telefono || '').trim(),
    plantillaId: plantillaId || null,
    notas: notas || '',
    ultimoEnvio: null,
    creado: new Date().toISOString(),
  };
  clientes.push(cliente);
  save('clientes', clientes);
  res.status(201).json(conVencimiento(cliente));
});

// Importación masiva desde Excel/CSV (el frontend parsea y envía JSON).
api.post('/clientes/importar', (req, res) => {
  const { filas, plantillaId } = req.body;
  if (!Array.isArray(filas)) {
    return res.status(400).json({ error: 'Se esperaba un arreglo de filas.' });
  }
  const clientes = load('clientes', []);
  const existentes = new Set(clientes.map((c) => c.cedula.replace(/\D/g, '')));
  let agregados = 0;
  let duplicados = 0;
  let invalidos = 0;

  for (const fila of filas) {
    const nombre = String(fila.nombre || '').trim();
    const cedula = String(fila.cedula || '').trim();
    if (!nombre || !cedula) {
      invalidos += 1;
      continue;
    }
    const clave = cedula.replace(/\D/g, '');
    if (existentes.has(clave)) {
      duplicados += 1;
      continue;
    }
    existentes.add(clave);
    clientes.push({
      id: nuevoId(),
      nombre,
      email: String(fila.email || '').trim().toLowerCase(),
      cedula,
      telefono: String(fila.telefono || '').trim(),
      plantillaId: fila.plantillaId || plantillaId || null,
      notas: '',
      ultimoEnvio: null,
      creado: new Date().toISOString(),
    });
    agregados += 1;
  }

  save('clientes', clientes);
  res.json({ agregados, duplicados, invalidos, total: clientes.length });
});

api.put('/clientes/:id', (req, res) => {
  const clientes = load('clientes', []);
  const cliente = clientes.find((c) => c.id === req.params.id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });
  const { nombre, email, cedula, telefono, plantillaId, notas } = req.body;
  if (nombre !== undefined) cliente.nombre = String(nombre).trim();
  if (email !== undefined) cliente.email = String(email).trim().toLowerCase();
  if (cedula !== undefined) cliente.cedula = String(cedula).trim();
  if (telefono !== undefined) cliente.telefono = String(telefono).trim();
  if (plantillaId !== undefined) cliente.plantillaId = plantillaId;
  if (notas !== undefined) cliente.notas = notas;
  save('clientes', clientes);
  res.json(conVencimiento(cliente));
});

api.delete('/clientes/:id', (req, res) => {
  const clientes = load('clientes', []);
  const restantes = clientes.filter((c) => c.id !== req.params.id);
  if (restantes.length === clientes.length) {
    return res.status(404).json({ error: 'Cliente no encontrado.' });
  }
  save('clientes', restantes);
  res.json({ ok: true });
});

// ---------- Plantillas de documentos ----------

api.get('/plantillas', (req, res) => {
  res.json(load('plantillas', []));
});

api.post('/plantillas', (req, res) => {
  const { nombre, documentos } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio.' });
  const plantillas = load('plantillas', []);
  const plantilla = {
    id: nuevoId(),
    nombre: String(nombre).trim(),
    documentos: Array.isArray(documentos) ? documentos : [],
  };
  plantillas.push(plantilla);
  save('plantillas', plantillas);
  res.status(201).json(plantilla);
});

api.put('/plantillas/:id', (req, res) => {
  const plantillas = load('plantillas', []);
  const plantilla = plantillas.find((p) => p.id === req.params.id);
  if (!plantilla) return res.status(404).json({ error: 'Plantilla no encontrada.' });
  const { nombre, documentos } = req.body;
  if (nombre !== undefined) plantilla.nombre = String(nombre).trim();
  if (documentos !== undefined) {
    plantilla.documentos = Array.isArray(documentos) ? documentos : [];
  }
  save('plantillas', plantillas);
  res.json(plantilla);
});

api.delete('/plantillas/:id', (req, res) => {
  const plantillas = load('plantillas', []);
  const restantes = plantillas.filter((p) => p.id !== req.params.id);
  if (restantes.length === plantillas.length) {
    return res.status(404).json({ error: 'Plantilla no encontrada.' });
  }
  save('plantillas', restantes);
  res.json({ ok: true });
});

// ---------- Calendario de vencimientos ----------

api.get('/calendario', (req, res) => {
  res.json(load('calendario', []));
});

api.put('/calendario', (req, res) => {
  const { calendario } = req.body;
  if (!Array.isArray(calendario)) {
    return res.status(400).json({ error: 'Formato inválido.' });
  }
  save('calendario', calendario);
  res.json({ ok: true });
});

// ---------- Configuración del correo ----------

api.get('/config', (req, res) => {
  res.json(load('config', {}));
});

api.put('/config', (req, res) => {
  const actual = load('config', {});
  const { asunto, cuerpo, remitente } = req.body;
  if (asunto !== undefined) actual.asunto = asunto;
  if (cuerpo !== undefined) actual.cuerpo = cuerpo;
  if (remitente !== undefined) actual.remitente = remitente;
  save('config', actual);
  res.json(actual);
});

// ---------- Correos ----------

api.get('/correos/previsualizar/:clienteId', (req, res) => {
  const cliente = load('clientes', []).find((c) => c.id === req.params.clienteId);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado.' });
  const preview = renderCorreo(cliente, load('plantillas', []), load('config', {}));
  res.json({
    para: cliente.email,
    asunto: preview.asunto,
    html: preview.html,
    advertencias: preview.advertencias,
  });
});

api.post('/correos/enviar', async (req, res) => {
  const { clienteIds } = req.body;
  if (!Array.isArray(clienteIds) || clienteIds.length === 0) {
    return res.status(400).json({ error: 'Selecciona al menos un cliente.' });
  }
  try {
    const resultados = await enviarLote(clienteIds);
    res.json({ resultados });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.get('/correos/historial', (req, res) => {
  const envios = load('envios', []);
  res.json(envios.slice(-500).reverse());
});

// ---------- Frontend (SPA compilada) ----------

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
app.use(express.static(PUBLIC_DIR));
app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'), (err) => {
    if (err) res.status(404).send('Frontend no compilado. Ejecuta npm run build en /client.');
  });
});

module.exports = app;
