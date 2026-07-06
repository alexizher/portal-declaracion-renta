// Migra a MySQL los datos de la versión anterior (archivos JSON en server/data/).
// Uso: node scripts/migrar-json.js
// Es idempotente: los clientes duplicados (misma cédula) y envíos ya migrados se omiten.

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const db = require('../src/db');
const datos = require('../src/datos');

const DATA_DIR = path.join(__dirname, '..', 'data');

function leer(nombre) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${nombre}.json`), 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  await db.init();

  const clientes = leer('clientes');
  if (clientes && clientes.length) {
    const r = await datos.importarClientes(clientes, null);
    console.log(`Clientes: ${r.agregados} migrados, ${r.duplicados} ya existían, ${r.invalidos} inválidos.`);
    // ultimo_envio no viaja por importarClientes; se copia aparte
    for (const c of clientes) {
      if (c.ultimoEnvio) {
        await db.q(
          'UPDATE clientes SET ultimo_envio = ?, plantilla_id = COALESCE(plantilla_id, ?) WHERE cedula_norm = ?',
          [
            c.ultimoEnvio.slice(0, 19).replace('T', ' '),
            c.plantillaId || null,
            String(c.cedula).replace(/\D/g, ''),
          ]
        );
      }
    }
  } else {
    console.log('Clientes: no hay data/clientes.json (nada que migrar).');
  }

  const plantillas = leer('plantillas');
  if (plantillas) {
    for (const p of plantillas) {
      await db.q(
        'INSERT IGNORE INTO plantillas (id, nombre, documentos) VALUES (?, ?, ?)',
        [p.id, p.nombre, JSON.stringify(p.documentos || [])]
      );
    }
    console.log(`Plantillas: ${plantillas.length} procesadas.`);
  }

  const envios = leer('envios');
  if (envios && envios.length) {
    let n = 0;
    for (const e of envios) {
      const r = await db.q(
        'INSERT IGNORE INTO envios (id, cliente_id, nombre, email, fecha, estado, error) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [e.id, e.clienteId, e.nombre, e.email, e.fecha.slice(0, 19).replace('T', ' '), e.estado, e.error]
      );
      n += r.affectedRows;
    }
    console.log(`Historial de envíos: ${n} registros migrados.`);
  }

  const config = leer('config');
  if (config) {
    await datos.guardarConfig(config);
    console.log('Configuración del correo migrada.');
  }

  const calendario = leer('calendario');
  if (calendario && calendario.length) {
    await datos.guardarCalendario(calendario);
    console.log('Calendario migrado.');
  }

  console.log('Migración completada.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error en la migración:', err.message);
  process.exit(1);
});
