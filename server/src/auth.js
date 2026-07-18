const crypto = require('crypto');

// Tokens sin estado: "expiracion.firmaHMAC". Passenger puede correr varios
// procesos de la app (y reiniciarlos), así que las sesiones no pueden vivir
// en memoria; la firma se deriva de ADMIN_PASSWORD y cualquier proceso puede
// validarla.

const DURACION_MS = 12 * 60 * 60 * 1000; // 12 horas

function claveFirma() {
  return crypto
    .createHash('sha256')
    .update(`renta-token:${process.env.ADMIN_PASSWORD}`)
    .digest();
}

function firmar(expiracion) {
  return crypto.createHmac('sha256', claveFirma()).update(String(expiracion)).digest('hex');
}

// timingSafeEqual exige buffers del mismo tamaño en BYTES; comparar .length de
// strings no alcanza con caracteres multibyte (tildes, ñ) y haría lanzar la
// comparación en vez de rechazar.
function igualSeguro(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

let intentosFallidos = 0;
let bloqueadoHasta = 0;

function login(password) {
  if (Date.now() < bloqueadoHasta) {
    return { error: 'Demasiados intentos. Espera un minuto e intenta de nuevo.' };
  }
  const esperado = process.env.ADMIN_PASSWORD;
  if (!esperado) {
    return { error: 'ADMIN_PASSWORD no está configurada en el servidor.' };
  }
  const ok = typeof password === 'string' && igualSeguro(password, esperado);
  if (!ok) {
    intentosFallidos += 1;
    if (intentosFallidos >= 5) {
      bloqueadoHasta = Date.now() + 60_000;
      intentosFallidos = 0;
    }
    return { error: 'Contraseña incorrecta.' };
  }
  intentosFallidos = 0;
  const expiracion = Date.now() + DURACION_MS;
  return { token: `${expiracion}.${firmar(expiracion)}` };
}

function tokenValido(token) {
  const [expStr, firma] = String(token || '').split('.');
  const expiracion = Number(expStr);
  if (!expiracion || Date.now() > expiracion || !firma) return false;
  return igualSeguro(firma, firmar(expiracion));
}

// ---------- Portal de documentos (Fase 2) ----------
// Cada cliente recibe por correo un enlace con un token propio, también sin
// estado: "clienteId.firmaHMAC". No expira (el cliente lo usa durante toda la
// temporada); cambiar ADMIN_PASSWORD invalida todos los enlaces.

function firmaPortal(clienteId) {
  return crypto
    .createHmac('sha256', claveFirma())
    .update(`portal:${clienteId}`)
    .digest('hex')
    .slice(0, 32);
}

function tokenPortal(clienteId) {
  return `${clienteId}.${firmaPortal(clienteId)}`;
}

function clienteIdDelPortal(token) {
  const [clienteId, firma] = String(token || '').split('.');
  if (!clienteId || !firma) return null;
  return igualSeguro(firma, firmaPortal(clienteId)) ? clienteId : null;
}

function requiereAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!tokenValido(token)) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  next();
}

module.exports = { login, requiereAuth, tokenPortal, clienteIdDelPortal };
