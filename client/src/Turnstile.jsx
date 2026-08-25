import { useEffect, useRef } from 'react';

// Widget de Cloudflare Turnstile para los formularios públicos (login del
// panel y recuperación del enlace del portal). Solo se pinta si el servidor
// entrega un site key en /api/portal/publico/config; sin llaves configuradas
// los formularios funcionan igual, sin verificación.

let scriptCargado = null; // promesa compartida: el script se inyecta una sola vez

function cargarScript() {
  if (!scriptCargado) {
    scriptCargado = new Promise((resolver) => {
      if (window.turnstile) return resolver();
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = () => resolver();
      document.head.appendChild(s);
    });
  }
  return scriptCargado;
}

export default function Turnstile({ siteKey, onToken }) {
  const ref = useRef(null);
  const widgetId = useRef(null);

  useEffect(() => {
    if (!siteKey) return undefined;
    let desmontado = false;
    cargarScript().then(() => {
      if (desmontado || !ref.current) return;
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        language: 'es',
        callback: (token) => onToken(token),
        'expired-callback': () => onToken(null),
        'error-callback': () => onToken(null),
      });
    });
    return () => {
      desmontado = true;
      if (widgetId.current !== null && window.turnstile) {
        window.turnstile.remove(widgetId.current);
      }
    };
  }, [siteKey]);

  if (!siteKey) return null;
  return <div ref={ref} className="turnstile" />;
}

// Pide la config pública una sola vez (site key de Turnstile o null).
export async function configPublica() {
  try {
    const res = await fetch('/api/portal/publico/config');
    return await res.json();
  } catch {
    return { turnstile: null };
  }
}
