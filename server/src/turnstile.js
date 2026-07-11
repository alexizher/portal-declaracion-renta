// Verificación de Cloudflare Turnstile (anti-robots) para los formularios
// públicos: login del panel y recuperación del enlace del portal.
// Se activa con TURNSTILE_SITE_KEY + TURNSTILE_SECRET en el .env; sin ellas
// todo pasa (útil en desarrollo y mientras no se creen las llaves).

function turnstileActivo() {
  return Boolean(process.env.TURNSTILE_SECRET);
}

// El site key es público: el frontend lo pide por /api/publico para saber si
// debe pintar el widget.
function turnstileSiteKey() {
  return process.env.TURNSTILE_SITE_KEY || null;
}

async function verificarTurnstile(token, ip) {
  if (!turnstileActivo()) return true;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET,
        response: String(token || ''),
        remoteip: ip,
      }),
    });
    const data = await res.json().catch(() => ({}));
    return Boolean(data.success);
  } catch (err) {
    // Si Cloudflare no responde, no dejamos a los usuarios por fuera.
    console.error('Turnstile siteverify:', err.message);
    return true;
  }
}

module.exports = { turnstileActivo, turnstileSiteKey, verificarTurnstile };
