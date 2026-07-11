// Cifrado de datos sensibles en reposo (la clave DIAN que el cliente deja en
// su portal). AES-256-GCM con llave derivada de DATA_SECRET (.env): si la
// base de datos llegara a filtrarse, los blobs no sirven sin el secreto del
// servidor. GCM además autentica: un blob alterado no descifra.
//
// El secreto es propio (no se deriva de ADMIN_PASSWORD) para poder rotar la
// contraseña del panel sin perder lo cifrado. Sin DATA_SECRET la función de
// clave DIAN queda deshabilitada (el portal oculta la tarjeta).

const crypto = require('crypto');

function cifradoActivo() {
  return Boolean(process.env.DATA_SECRET);
}

function llave() {
  return crypto.createHash('sha256').update(`renta-datos:${process.env.DATA_SECRET}`).digest();
}

// Devuelve base64(iv | authTag | cifrado).
function cifrar(texto) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', llave(), iv);
  const cifrado = Buffer.concat([cipher.update(String(texto), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), cifrado]).toString('base64');
}

function descifrar(b64) {
  const datos = Buffer.from(String(b64), 'base64');
  const iv = datos.subarray(0, 12);
  const tag = datos.subarray(12, 28);
  const cifrado = datos.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', llave(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(cifrado), decipher.final()]).toString('utf8');
}

module.exports = { cifradoActivo, cifrar, descifrar };
