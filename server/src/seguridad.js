// Cabeceras de seguridad, control de caché y limitador de peticiones.
// Sin dependencias externas a propósito: nació de que el hosting no tenía
// shell y todo se subía por SFTP. Ya hay SSH y `npm install` corre en el
// servidor, así que la restricción no aplica — se mantiene porque son ~90
// líneas que hacen exactamente lo que se necesita (helmet + express-rate-limit
// traerían mucho más de lo que se usa).

const TURNSTILE = 'https://challenges.cloudflare.com';

// CSP pensada para la SPA compilada por Vite + el widget de Turnstile.
// - script/frame de challenges.cloudflare.com: los exige el widget.
// - style-src 'unsafe-inline': la previsualización de correos del panel pinta
//   el HTML real del mensaje (estilos inline de correo) con
//   dangerouslySetInnerHTML; sin esto se vería en blanco.
// - 'wasm-unsafe-eval' + connect-src data:: @react-pdf/renderer (Anexos PDF)
//   compila internamente un motor de layout flexbox (yoga) a WebAssembly,
//   embebido como data: URI — sin estos dos permisos el navegador bloquea la
//   compilación del wasm y "Descargar PDF" no hace nada (sin error visible
//   para el usuario, solo en la consola). 'wasm-unsafe-eval' es más acotado
//   que 'unsafe-eval': solo habilita WebAssembly.instantiate(), no eval()/
//   Function() de cadenas JS arbitrarias.
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'wasm-unsafe-eval' ${TURNSTILE}`,
  `frame-src ${TURNSTILE}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self' data:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

function cabeceras(req, res, next) {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Los enlaces del portal llevan el token en la propia URL: no filtrar
  // jamás el Referer hacia otros sitios.
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  // HSTS solo cuando la petición llegó por HTTPS (req.secure lee
  // X-Forwarded-Proto gracias a trust proxy); en dev local por HTTP no aplica.
  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // Todo el API es dinámico y privado (datos de clientes, descargas):
  // ni el navegador ni ningún proxy intermedio deben guardar copia.
  if (req.path === '/api' || req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
}

// ---------- Limitador de peticiones (ventana fija, en memoria) ----------
// Passenger puede correr varios procesos, cada uno con sus contadores, así
// que el límite efectivo puede ser algo más holgado que el configurado.
// Suficiente contra fuerza bruta y raspado; no requiere base de datos.

const cubetas = new Map();

// Limpieza periódica para que las cubetas vencidas no se acumulen.
setInterval(() => {
  const ahora = Date.now();
  for (const [llave, cubeta] of cubetas) {
    if (cubeta.reinicio <= ahora) cubetas.delete(llave);
  }
}, 60_000).unref();

function limitador({ nombre, ventanaMin, max, mensaje }) {
  const ventanaMs = ventanaMin * 60_000;
  return (req, res, next) => {
    const llave = `${nombre}:${req.ip}`;
    const ahora = Date.now();
    let cubeta = cubetas.get(llave);
    if (!cubeta || cubeta.reinicio <= ahora) {
      cubeta = { visto: 0, reinicio: ahora + ventanaMs };
      cubetas.set(llave, cubeta);
    }
    cubeta.visto += 1;
    if (cubeta.visto > max) {
      res.setHeader('Retry-After', Math.ceil((cubeta.reinicio - ahora) / 1000));
      return res.status(429).json({
        error:
          mensaje || 'Demasiadas peticiones seguidas. Espera unos minutos e intenta de nuevo.',
      });
    }
    next();
  };
}

module.exports = { cabeceras, limitador };
