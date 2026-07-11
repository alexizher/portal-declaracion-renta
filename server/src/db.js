const mysql = require('mysql2/promise');
const { CALENDARIO_2026, PLANTILLAS_INICIALES, CONFIG_INICIAL } = require('./seed');

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      // Hosting compartido: cPanel limita conexiones simultáneas por usuario.
      connectionLimit: 4,
      dateStrings: true,
      charset: 'utf8mb4',
    });
  }
  return pool;
}

async function q(sql, params = []) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}

const TABLAS = [
  `CREATE TABLE IF NOT EXISTS clientes (
    id VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL DEFAULT '',
    cedula VARCHAR(50) NOT NULL,
    cedula_norm VARCHAR(50) NOT NULL,
    telefono VARCHAR(50) NOT NULL DEFAULT '',
    plantilla_id VARCHAR(40) NULL,
    notas TEXT,
    declarado TINYINT(1) NOT NULL DEFAULT 0,
    ultimo_envio DATETIME NULL,
    creado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cedula_norm (cedula_norm)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS plantillas (
    id VARCHAR(40) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    documentos TEXT NOT NULL
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS calendario (
    posicion INT PRIMARY KEY,
    digitos VARCHAR(20) NOT NULL,
    fecha DATE NOT NULL
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS config (
    clave VARCHAR(50) PRIMARY KEY,
    valor TEXT NOT NULL
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS envios (
    id VARCHAR(20) PRIMARY KEY,
    cliente_id VARCHAR(20) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL DEFAULT '',
    fecha DATETIME NOT NULL,
    estado VARCHAR(20) NOT NULL,
    error TEXT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'recordatorio',
    KEY idx_fecha (fecha)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  // Fase 2: archivos que los clientes suben desde el portal. El checklist se
  // arma cruzando la plantilla del cliente con estas filas; la clave es el
  // nombre del documento (hasheado, porque los nombres son frases largas y
  // no caben en un índice único utf8mb4).
  `CREATE TABLE IF NOT EXISTS documentos (
    id VARCHAR(20) PRIMARY KEY,
    cliente_id VARCHAR(20) NOT NULL,
    nombre TEXT NOT NULL,
    nombre_hash CHAR(40) NOT NULL,
    archivo VARCHAR(100) NOT NULL,
    original VARCHAR(255) NOT NULL,
    mime VARCHAR(100) NOT NULL,
    tamano INT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'subido',
    motivo TEXT NULL,
    subido_en DATETIME NOT NULL,
    revisado_en DATETIME NULL,
    UNIQUE KEY uq_cliente_doc (cliente_id, nombre_hash),
    KEY idx_cliente (cliente_id)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
];

async function init() {
  for (const ddl of TABLAS) await q(ddl);

  // Migración: la tabla envios de la Fase 1 no tenía la columna tipo
  // (recordatorio | revision). ALTER solo si falta.
  const [{ n: tieneTipo }] = await q(
    `SELECT COUNT(*) AS n FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'envios' AND column_name = 'tipo'`
  );
  if (tieneTipo === 0) {
    await q(`ALTER TABLE envios ADD COLUMN tipo VARCHAR(20) NOT NULL DEFAULT 'recordatorio'`);
  }

  // Migración: clientes.declarado (marca "ya declaró": sale de las alertas y
  // de los envíos masivos). ALTER solo si falta.
  const [{ n: tieneDeclarado }] = await q(
    `SELECT COUNT(*) AS n FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'clientes' AND column_name = 'declarado'`
  );
  if (tieneDeclarado === 0) {
    await q(`ALTER TABLE clientes ADD COLUMN declarado TINYINT(1) NOT NULL DEFAULT 0`);
  }

  const [{ n: nCalendario }] = await q('SELECT COUNT(*) AS n FROM calendario');
  if (nCalendario === 0) {
    for (let i = 0; i < CALENDARIO_2026.length; i++) {
      const e = CALENDARIO_2026[i];
      await q('INSERT INTO calendario (posicion, digitos, fecha) VALUES (?, ?, ?)', [
        i,
        JSON.stringify(e.digitos),
        e.fecha,
      ]);
    }
  }

  const [{ n: nPlantillas }] = await q('SELECT COUNT(*) AS n FROM plantillas');
  if (nPlantillas === 0) {
    for (const p of PLANTILLAS_INICIALES) {
      await q('INSERT INTO plantillas (id, nombre, documentos) VALUES (?, ?, ?)', [
        p.id,
        p.nombre,
        JSON.stringify(p.documentos),
      ]);
    }
  }

  // Config: agrega solo las claves que falten, sin tocar las que el usuario
  // ya editó desde el panel (así las claves nuevas llegan a instalaciones
  // existentes).
  for (const [clave, valor] of Object.entries(CONFIG_INICIAL)) {
    await q('INSERT IGNORE INTO config (clave, valor) VALUES (?, ?)', [clave, valor]);
  }
}

module.exports = { q, init, getPool };
