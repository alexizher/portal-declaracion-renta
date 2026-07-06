// Capa de acceso a datos: todas las consultas SQL viven aquí.
// Las funciones devuelven los mismos objetos (camelCase) que consumía el
// frontend cuando los datos vivían en JSON.

const crypto = require('crypto');
const { q } = require('./db');

function nuevoId() {
  return crypto.randomBytes(8).toString('hex');
}

function normalizarCedula(cedula) {
  return String(cedula || '').replace(/\D/g, '');
}

// ---------- Clientes ----------

function mapCliente(r) {
  return {
    id: r.id,
    nombre: r.nombre,
    email: r.email,
    cedula: r.cedula,
    telefono: r.telefono,
    plantillaId: r.plantilla_id,
    notas: r.notas || '',
    ultimoEnvio: r.ultimo_envio,
    creado: r.creado,
  };
}

async function listarClientes() {
  const filas = await q('SELECT * FROM clientes ORDER BY nombre');
  return filas.map(mapCliente);
}

async function obtenerCliente(id) {
  const filas = await q('SELECT * FROM clientes WHERE id = ?', [id]);
  return filas.length ? mapCliente(filas[0]) : null;
}

async function crearCliente({ nombre, email, cedula, telefono, plantillaId, notas }) {
  const id = nuevoId();
  await q(
    `INSERT INTO clientes (id, nombre, email, cedula, cedula_norm, telefono, plantilla_id, notas)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      String(nombre).trim(),
      String(email || '').trim().toLowerCase(),
      String(cedula).trim(),
      normalizarCedula(cedula),
      String(telefono || '').trim(),
      plantillaId || null,
      notas || '',
    ]
  );
  return obtenerCliente(id);
}

async function importarClientes(filas, plantillaIdPorDefecto) {
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
    try {
      await q(
        `INSERT INTO clientes (id, nombre, email, cedula, cedula_norm, telefono, plantilla_id, notas)
         VALUES (?, ?, ?, ?, ?, ?, ?, '')`,
        [
          nuevoId(),
          nombre,
          String(fila.email || '').trim().toLowerCase(),
          cedula,
          normalizarCedula(cedula),
          String(fila.telefono || '').trim(),
          fila.plantillaId || plantillaIdPorDefecto || null,
        ]
      );
      agregados += 1;
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') duplicados += 1;
      else throw err;
    }
  }

  const [{ n: total }] = await q('SELECT COUNT(*) AS n FROM clientes');
  return { agregados, duplicados, invalidos, total };
}

async function actualizarCliente(id, campos) {
  const cliente = await obtenerCliente(id);
  if (!cliente) return null;
  const { nombre, email, cedula, telefono, plantillaId, notas } = campos;
  const nuevaCedula = cedula !== undefined ? String(cedula).trim() : cliente.cedula;
  await q(
    `UPDATE clientes SET nombre = ?, email = ?, cedula = ?, cedula_norm = ?,
       telefono = ?, plantilla_id = ?, notas = ?
     WHERE id = ?`,
    [
      nombre !== undefined ? String(nombre).trim() : cliente.nombre,
      email !== undefined ? String(email).trim().toLowerCase() : cliente.email,
      nuevaCedula,
      normalizarCedula(nuevaCedula),
      telefono !== undefined ? String(telefono).trim() : cliente.telefono,
      plantillaId !== undefined ? plantillaId || null : cliente.plantillaId,
      notas !== undefined ? notas : cliente.notas,
      id,
    ]
  );
  return obtenerCliente(id);
}

async function eliminarCliente(id) {
  const r = await q('DELETE FROM clientes WHERE id = ?', [id]);
  return r.affectedRows > 0;
}

async function marcarUltimoEnvio(id, fechaIso) {
  await q('UPDATE clientes SET ultimo_envio = ? WHERE id = ?', [
    fechaIso.slice(0, 19).replace('T', ' '),
    id,
  ]);
}

// ---------- Plantillas ----------

function mapPlantilla(r) {
  return { id: r.id, nombre: r.nombre, documentos: JSON.parse(r.documentos) };
}

async function listarPlantillas() {
  return (await q('SELECT * FROM plantillas ORDER BY nombre')).map(mapPlantilla);
}

async function crearPlantilla({ nombre, documentos }) {
  const id = nuevoId();
  await q('INSERT INTO plantillas (id, nombre, documentos) VALUES (?, ?, ?)', [
    id,
    String(nombre).trim(),
    JSON.stringify(Array.isArray(documentos) ? documentos : []),
  ]);
  return mapPlantilla((await q('SELECT * FROM plantillas WHERE id = ?', [id]))[0]);
}

async function actualizarPlantilla(id, { nombre, documentos }) {
  const filas = await q('SELECT * FROM plantillas WHERE id = ?', [id]);
  if (!filas.length) return null;
  const actual = mapPlantilla(filas[0]);
  await q('UPDATE plantillas SET nombre = ?, documentos = ? WHERE id = ?', [
    nombre !== undefined ? String(nombre).trim() : actual.nombre,
    JSON.stringify(documentos !== undefined ? documentos : actual.documentos),
    id,
  ]);
  return mapPlantilla((await q('SELECT * FROM plantillas WHERE id = ?', [id]))[0]);
}

async function eliminarPlantilla(id) {
  const r = await q('DELETE FROM plantillas WHERE id = ?', [id]);
  return r.affectedRows > 0;
}

// ---------- Calendario ----------

async function obtenerCalendario() {
  const filas = await q('SELECT * FROM calendario ORDER BY posicion');
  return filas.map((r) => ({ digitos: JSON.parse(r.digitos), fecha: r.fecha }));
}

async function guardarCalendario(entradas) {
  await q('DELETE FROM calendario');
  for (let i = 0; i < entradas.length; i++) {
    await q('INSERT INTO calendario (posicion, digitos, fecha) VALUES (?, ?, ?)', [
      i,
      JSON.stringify(entradas[i].digitos),
      entradas[i].fecha,
    ]);
  }
}

// ---------- Config ----------

async function obtenerConfig() {
  const filas = await q('SELECT clave, valor FROM config');
  return Object.fromEntries(filas.map((r) => [r.clave, r.valor]));
}

async function guardarConfig(parcial) {
  for (const [clave, valor] of Object.entries(parcial)) {
    if (valor === undefined) continue;
    await q('INSERT INTO config (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = ?', [
      clave,
      valor,
      valor,
    ]);
  }
  return obtenerConfig();
}

// ---------- Envíos ----------

async function registrarEnvio(registro) {
  await q(
    'INSERT INTO envios (id, cliente_id, nombre, email, fecha, estado, error) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      registro.id,
      registro.clienteId,
      registro.nombre,
      registro.email,
      registro.fecha.slice(0, 19).replace('T', ' '),
      registro.estado,
      registro.error,
    ]
  );
}

async function listarEnvios(limite = 500) {
  const filas = await q('SELECT * FROM envios ORDER BY fecha DESC, id DESC LIMIT ?', [limite]);
  return filas.map((r) => ({
    id: r.id,
    clienteId: r.cliente_id,
    nombre: r.nombre,
    email: r.email,
    fecha: r.fecha,
    estado: r.estado,
    error: r.error,
  }));
}

module.exports = {
  nuevoId,
  listarClientes,
  obtenerCliente,
  crearCliente,
  importarClientes,
  actualizarCliente,
  eliminarCliente,
  marcarUltimoEnvio,
  listarPlantillas,
  crearPlantilla,
  actualizarPlantilla,
  eliminarPlantilla,
  obtenerCalendario,
  guardarCalendario,
  obtenerConfig,
  guardarConfig,
  registrarEnvio,
  listarEnvios,
};
