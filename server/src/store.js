const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function load(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath(name), 'utf8'));
  } catch {
    return fallback;
  }
}

// Escritura atómica: escribe a un temporal y renombra, para no corromper
// el archivo si el proceso muere a mitad de escritura.
function save(name, value) {
  const target = filePath(name);
  const tmp = `${target}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, target);
}

function nuevoId() {
  return crypto.randomBytes(8).toString('hex');
}

module.exports = { load, save, nuevoId, DATA_DIR };
