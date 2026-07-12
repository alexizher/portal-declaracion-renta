// Capa de acceso a datos: todas las consultas SQL viven aquí.
// Las funciones devuelven los mismos objetos (camelCase) que consumía el
// frontend cuando los datos vivían en JSON.

const crypto = require('crypto');
const { q } = require('./db');

function nuevoId() {
  return crypto.randomBytes(8).toString('hex');
}

// Fecha y hora de Colombia en "YYYY-MM-DD HH:mm:ss" (formato sv-SE). Todo el
// historial se guarda y se muestra en hora local del negocio; guardar UTC
// hacía que el panel mostrara los registros con 5 horas de diferencia.
function ahoraBogota() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'America/Bogota' });
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
    declarado: Boolean(r.declarado),
    // La clave DIAN cifrada nunca sale en el objeto normal; solo la fecha.
    dianActualizado: r.dian_actualizado || null,
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

// Búsqueda por cédula normalizada (solo dígitos) para "recuperar mi enlace".
async function obtenerClientePorCedula(cedula) {
  const norm = normalizarCedula(cedula);
  if (!norm) return null;
  const filas = await q('SELECT * FROM clientes WHERE cedula_norm = ?', [norm]);
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
  const { nombre, email, cedula, telefono, plantillaId, notas, declarado } = campos;
  const nuevaCedula = cedula !== undefined ? String(cedula).trim() : cliente.cedula;
  await q(
    `UPDATE clientes SET nombre = ?, email = ?, cedula = ?, cedula_norm = ?,
       telefono = ?, plantilla_id = ?, notas = ?, declarado = ?
     WHERE id = ?`,
    [
      nombre !== undefined ? String(nombre).trim() : cliente.nombre,
      email !== undefined ? String(email).trim().toLowerCase() : cliente.email,
      nuevaCedula,
      normalizarCedula(nuevaCedula),
      telefono !== undefined ? String(telefono).trim() : cliente.telefono,
      plantillaId !== undefined ? plantillaId || null : cliente.plantillaId,
      notas !== undefined ? notas : cliente.notas,
      declarado !== undefined ? (declarado ? 1 : 0) : cliente.declarado ? 1 : 0,
      id,
    ]
  );
  return obtenerCliente(id);
}

async function eliminarCliente(id) {
  const r = await q('DELETE FROM clientes WHERE id = ?', [id]);
  await q('DELETE FROM documentos WHERE cliente_id = ?', [id]);
  await q('DELETE FROM entregas WHERE cliente_id = ?', [id]);
  return r.affectedRows > 0;
}

// Perfil editable por el propio cliente desde su portal: solo correo y
// teléfono; el resto (nombre, cédula, plantilla) es del panel.
async function actualizarPerfilPortal(id, { email, telefono }) {
  await q('UPDATE clientes SET email = ?, telefono = ? WHERE id = ?', [
    String(email || '').trim().toLowerCase(),
    String(telefono || '').trim(),
    id,
  ]);
  return obtenerCliente(id);
}

// ---------- Entregas (documentos finales que el panel sube al cliente) ----------

// Tipos válidos: declaración presentada, anexo de renta y recibo de pago DIAN.
const TIPOS_ENTREGA = ['declaracion', 'anexo', 'recibo'];

function mapEntrega(r) {
  return { tipo: r.tipo, archivo: r.archivo, original: r.original, fecha: r.fecha };
}

async function listarEntregas(clienteId) {
  const filas = await q('SELECT * FROM entregas WHERE cliente_id = ?', [clienteId]);
  return filas.map(mapEntrega);
}

// Inserta o reemplaza el archivo de un tipo. Subir la declaración marca al
// cliente como "ya declaró". Devuelve el archivo anterior para borrarlo.
async function guardarEntrega(clienteId, tipo, { archivo, original, fecha }) {
  const previas = await q('SELECT * FROM entregas WHERE cliente_id = ? AND tipo = ?', [
    clienteId,
    tipo,
  ]);
  await q(
    `INSERT INTO entregas (cliente_id, tipo, archivo, original, fecha) VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE archivo = VALUES(archivo), original = VALUES(original), fecha = VALUES(fecha)`,
    [clienteId, tipo, archivo, original, fecha]
  );
  if (tipo === 'declaracion') {
    await q('UPDATE clientes SET declarado = 1 WHERE id = ?', [clienteId]);
  }
  return { anterior: previas.length ? previas[0].archivo : null };
}

async function borrarEntrega(clienteId, tipo) {
  const previas = await q('SELECT * FROM entregas WHERE cliente_id = ? AND tipo = ?', [
    clienteId,
    tipo,
  ]);
  if (!previas.length) return null;
  await q('DELETE FROM entregas WHERE cliente_id = ? AND tipo = ?', [clienteId, tipo]);
  return { anterior: previas[0].archivo };
}

// ---------- Clave DIAN (cifrada; el blob solo se lee desde el panel) ----------

async function guardarClaveDian(id, cifrado, fecha) {
  await q('UPDATE clientes SET dian_clave = ?, dian_actualizado = ? WHERE id = ?', [
    cifrado,
    fecha,
    id,
  ]);
}

async function obtenerClaveDianCifrada(id) {
  const filas = await q('SELECT dian_clave FROM clientes WHERE id = ?', [id]);
  return filas.length ? filas[0].dian_clave : null;
}

async function borrarClaveDian(id) {
  await q('UPDATE clientes SET dian_clave = NULL, dian_actualizado = NULL WHERE id = ?', [id]);
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

// ---------- Documentos del portal (Fase 2) ----------

// Los nombres de documento son frases largas; el índice único por cliente usa
// su hash porque un TEXT utf8mb4 no cabe completo en la clave.
function hashNombreDoc(nombre) {
  return crypto.createHash('sha1').update(String(nombre)).digest('hex');
}

function mapDocumento(r) {
  return {
    id: r.id,
    clienteId: r.cliente_id,
    nombre: r.nombre,
    archivo: r.archivo,
    original: r.original,
    mime: r.mime,
    tamano: r.tamano,
    estado: r.estado,
    motivo: r.motivo || '',
    subidoEn: r.subido_en,
    revisadoEn: r.revisado_en,
  };
}

async function listarDocumentosDe(clienteId) {
  const filas = await q('SELECT * FROM documentos WHERE cliente_id = ? ORDER BY subido_en', [
    clienteId,
  ]);
  return filas.map(mapDocumento);
}

async function obtenerDocumento(id) {
  const filas = await q('SELECT * FROM documentos WHERE id = ?', [id]);
  return filas.length ? mapDocumento(filas[0]) : null;
}

// Inserta o reemplaza el archivo de un documento del checklist. Reemplazar
// vuelve el estado a "subido" (queda otra vez en revisión) y devuelve el
// nombre del archivo anterior para borrarlo del disco.
async function guardarDocumento({ clienteId, nombre, archivo, original, mime, tamano, fecha }) {
  const hash = hashNombreDoc(nombre);
  const previas = await q('SELECT * FROM documentos WHERE cliente_id = ? AND nombre_hash = ?', [
    clienteId,
    hash,
  ]);
  if (previas.length) {
    const anterior = mapDocumento(previas[0]);
    await q(
      `UPDATE documentos SET archivo = ?, original = ?, mime = ?, tamano = ?,
         estado = 'subido', motivo = NULL, subido_en = ?, revisado_en = NULL
       WHERE id = ?`,
      [archivo, original, mime, tamano, fecha, anterior.id]
    );
    return { documento: await obtenerDocumento(anterior.id), archivoAnterior: anterior.archivo };
  }
  const id = nuevoId();
  await q(
    `INSERT INTO documentos (id, cliente_id, nombre, nombre_hash, archivo, original, mime, tamano, subido_en)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, clienteId, nombre, hash, archivo, original, mime, tamano, fecha]
  );
  return { documento: await obtenerDocumento(id), archivoAnterior: null };
}

async function revisarDocumento(id, { estado, motivo, fecha }) {
  const doc = await obtenerDocumento(id);
  if (!doc) return null;
  await q('UPDATE documentos SET estado = ?, motivo = ?, revisado_en = ? WHERE id = ?', [
    estado,
    motivo || null,
    fecha,
    id,
  ]);
  return obtenerDocumento(id);
}

// Conteos por cliente para la vista de revisión del panel.
async function resumenDocumentos() {
  const filas = await q(
    `SELECT cliente_id,
       SUM(estado = 'subido') AS subidos,
       SUM(estado = 'aprobado') AS aprobados,
       SUM(estado = 'rechazado') AS rechazados,
       MAX(subido_en) AS ultimo
     FROM documentos GROUP BY cliente_id`
  );
  return filas.map((r) => ({
    clienteId: r.cliente_id,
    subidos: Number(r.subidos),
    aprobados: Number(r.aprobados),
    rechazados: Number(r.rechazados),
    ultimo: r.ultimo,
  }));
}

// Une la lista de la plantilla del cliente con lo que ha subido: cada ítem
// queda pendiente | subido | aprobado | rechazado. Los archivos cuyo nombre ya
// no está en la plantilla (porque se editó) se agregan al final para que nada
// subido quede invisible.
function armarChecklist(plantilla, documentos) {
  const porNombre = new Map(documentos.map((d) => [d.nombre, d]));
  const deDoc = (nombre, d, extra) => ({
    nombre,
    estado: d ? d.estado : 'pendiente',
    motivo: d ? d.motivo : '',
    documentoId: d ? d.id : null,
    original: d ? d.original : null,
    mime: d ? d.mime : null,
    tamano: d ? d.tamano : null,
    subidoEn: d ? d.subidoEn : null,
    revisadoEn: d ? d.revisadoEn : null,
    extra,
  });
  const nombresPlantilla = plantilla ? plantilla.documentos : [];
  const items = nombresPlantilla.map((nombre) => deDoc(nombre, porNombre.get(nombre), false));
  const enPlantilla = new Set(nombresPlantilla);
  const extras = documentos
    .filter((d) => !enPlantilla.has(d.nombre))
    .map((d) => deDoc(d.nombre, d, true));
  return [...items, ...extras];
}

// ---------- Envíos ----------

async function registrarEnvio(registro) {
  await q(
    'INSERT INTO envios (id, cliente_id, nombre, email, fecha, estado, error, tipo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      registro.id,
      registro.clienteId,
      registro.nombre,
      registro.email,
      registro.fecha.slice(0, 19).replace('T', ' '),
      registro.estado,
      registro.error,
      registro.tipo || 'recordatorio',
    ]
  );
}

// ¿Ya hubo un envío exitoso de este tipo desde la fecha dada? Se usa para no
// repetir avisos internos (subidas al portal, alerta diaria de vencimientos).
async function hayEnvioDesde(tipo, desde, clienteId = null) {
  let sql = `SELECT COUNT(*) AS n FROM envios WHERE tipo = ? AND estado = 'enviado' AND fecha >= ?`;
  const params = [tipo, desde];
  if (clienteId) {
    sql += ' AND cliente_id = ?';
    params.push(clienteId);
  }
  const [{ n }] = await q(sql, params);
  return n > 0;
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
    tipo: r.tipo,
  }));
}

module.exports = {
  nuevoId,
  ahoraBogota,
  listarClientes,
  obtenerCliente,
  obtenerClientePorCedula,
  crearCliente,
  importarClientes,
  actualizarCliente,
  actualizarPerfilPortal,
  guardarClaveDian,
  obtenerClaveDianCifrada,
  borrarClaveDian,
  TIPOS_ENTREGA,
  listarEntregas,
  guardarEntrega,
  borrarEntrega,
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
  listarDocumentosDe,
  obtenerDocumento,
  guardarDocumento,
  revisarDocumento,
  resumenDocumentos,
  armarChecklist,
  registrarEnvio,
  hayEnvioDesde,
  listarEnvios,
};
