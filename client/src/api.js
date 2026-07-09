let token = localStorage.getItem('token') || null;

export function setToken(t) {
  token = t;
  if (t) localStorage.setItem('token', t);
  else localStorage.removeItem('token');
}

export function hayToken() {
  return Boolean(token);
}

export async function api(ruta, opciones = {}) {
  const res = await fetch(`/api${ruta}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opciones.headers,
    },
    body: opciones.body ? JSON.stringify(opciones.body) : undefined,
  });
  if (res.status === 401) {
    setToken(null);
    window.dispatchEvent(new Event('sesion-expirada'));
    throw new Error('Sesión expirada. Inicia sesión de nuevo.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

// Descarga binaria autenticada (los archivos del portal no se sirven como
// estáticos: solo salen por la API con el token del panel).
export async function apiArchivo(ruta) {
  const res = await fetch(`/api${ruta}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Error ${res.status}`);
  }
  return res.blob();
}
