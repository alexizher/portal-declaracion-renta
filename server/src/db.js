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
    KEY idx_fecha (fecha)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
];

async function init() {
  for (const ddl of TABLAS) await q(ddl);

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

  const [{ n: nConfig }] = await q('SELECT COUNT(*) AS n FROM config');
  if (nConfig === 0) {
    for (const [clave, valor] of Object.entries(CONFIG_INICIAL)) {
      await q('INSERT INTO config (clave, valor) VALUES (?, ?)', [clave, valor]);
    }
  }
}

module.exports = { q, init, getPool };
