const crypto = require('crypto');

// Sesiones en memoria: si Passenger reinicia la app, toca iniciar sesión de
// nuevo. Suficiente para un único administrador.
const sesiones = new Set();

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
  const ok =
    typeof password === 'string' &&
    password.length === esperado.length &&
    crypto.timingSafeEqual(Buffer.from(password), Buffer.from(esperado));
  if (!ok) {
    intentosFallidos += 1;
    if (intentosFallidos >= 5) {
      bloqueadoHasta = Date.now() + 60_000;
      intentosFallidos = 0;
    }
    return { error: 'Contraseña incorrecta.' };
  }
  intentosFallidos = 0;
  const token = crypto.randomBytes(24).toString('hex');
  sesiones.add(token);
  return { token };
}

function requiereAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || !sesiones.has(token)) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  next();
}

module.exports = { login, requiereAuth };
