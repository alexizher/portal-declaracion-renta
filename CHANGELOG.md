# Changelog

Historial de cambios del portal de declaración de renta. Fechas en hora de
Colombia; los hashes referencian los commits en `main`.

## 2026-07-17 (noche) — Uploads fuera del docroot y comparación segura en auth

- **Subidas fuera del document root** (solo servidor, sin cambio de código):
  la carpeta de archivos de clientes se movió de `<app root>/uploads/` a
  `/home/repolite/renta-uploads/` (directorio hermano, no servible por
  LiteSpeed) y se agregó `UPLOADS_DIR` al `.env` de prod. Verificado el ciclo
  completo en producción: descarga por API (200), subida (cae en la ruta
  nueva) y `/uploads/...` directo sigue 403 (el bloqueo `mod_rewrite` del
  `.htaccess` queda como doble candado). Cierra el pendiente de defensa en
  profundidad del endurecimiento de la mañana.
- **`auth.js`: comparación en tiempo constante por bytes** (`209a70d`): las
  tres comparaciones sensibles (contraseña del panel, token de sesión, firma
  del enlace del portal) pasan por un único `igualSeguro()` que compara
  `Buffer`s por tamaño en bytes; antes una entrada multibyte (tildes, ñ) con
  la misma longitud de caracteres hacía lanzar `timingSafeEqual` y terminaba
  en 500.

## 2026-07-17 — Endurecimiento: cabeceras de seguridad, caché y rate limit

- **Cabeceras de seguridad** (`server/src/seguridad.js`, sin dependencias
  nuevas): CSP (permite solo `'self'` + `challenges.cloudflare.com` para
  Turnstile), `Strict-Transport-Security` (1 año, solo sobre HTTPS),
  `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: no-referrer` (los enlaces del portal llevan el token en
  la URL), `Permissions-Policy` y COOP/CORP. Se quitó `X-Powered-By`.
- **Control de caché**: `no-store` en todo `/api` (datos de clientes y
  descargas), `no-cache` + ETag en `index.html` y logos, e
  `immutable` de 1 año en los assets con hash de Vite.
- **Rate limit por IP** (ventana fija en memoria): 10/15 min en login del
  panel y "recuperar mi enlace", 60/10 min en subidas del portal, 120/5 min
  en el portal y 600/5 min en el API. Responde 429 con `Retry-After`.
- **`trust proxy`**: `req.ip` ahora es el IP real del visitante detrás de
  Passenger/LiteSpeed (lo usan el rate limit y Turnstile). Nueva variable
  opcional `TRUST_PROXY` (defecto 1; poner 2 si el dominio pasa por el proxy
  de Cloudflare).
- **`.htaccess` de producción** (solo en el servidor): bloque `mod_headers`
  que replica las cabeceras y el caché en los estáticos que LiteSpeed sirve
  sin pasar por Node (ver manual técnico §9).
- **Cierre de exposición crítica** (`.htaccess`, solo servidor): LiteSpeed
  servía directo, por su ruta en disco y **sin token**, los PDFs de clientes
  (`/uploads/...`), el código fuente (`/src/...`, `/server.js`) y `stderr.log`.
  Reglas `mod_rewrite` que devuelven 403 en esas rutas; los documentos
  legítimos siguen saliendo solo por la API autenticada. Pendiente de defensa
  en profundidad: mover `UPLOADS_DIR` fuera del document root.

## 2026-07-11 (noche) — Entregas, clave DIAN y plantilla de novedades

- **Plantilla "Novedades del portal"**: tercer mensaje masivo editable en la
  pestaña Correos; explica al cliente qué puede hacer en su portal. Variable
  nueva `{{recuperar}}` (URL de la página "recuperar mi enlace").
- **Documentos finales para el cliente** (`599045f`): desde Revisión se suben
  la declaración presentada, el anexo de renta y el recibo de pago DIAN
  (tabla `entregas`, un archivo por tipo). El cliente los descarga desde su
  portal; subir la declaración lo marca "ya declaró" automáticamente.
- **Clave DIAN cifrada** (`a2ce26a`): el cliente la deja en su portal; se
  cifra con AES-256-GCM (`DATA_SECRET`) y el portal nunca la devuelve. Solo el
  panel la descifra (Ver/Copiar/Borrar en Revisión).
- **Perfil editable** (`a2ce26a`): lápiz en el portal para que el cliente
  corrija su correo y celular.

## 2026-07-11 (tarde) — Recuperación de enlace y Turnstile

- **"¿Perdiste tu enlace?"** (`8f1d365`): en `/portal` el cliente escribe su
  cédula y se le reenvía su enlace personal al correo registrado. Respuesta
  genérica (anti-enumeración) y freno de 15 min por cliente.
- **Cloudflare Turnstile** (`8f1d365`, fix `abd3330`): verificación
  anti-robots en el login del panel y en la recuperación de enlace
  (`TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET`).

## 2026-07-11 (mediodía) — Rediseño UX del portal

- (`fa26084`) Checklist agrupado por estado (Necesitan corrección → Por subir
  → En revisión → Aprobados), barra de progreso, chip de urgencia del
  vencimiento, cuadrícula en escritorio / lista en móvil, iconos SVG, toast de
  confirmación y mejoras de accesibilidad (focus visible, reduced-motion,
  botones ≥44px).

## 2026-07-11 (mañana) — Fase 3: avisos y documentos adicionales

- (`da425a2`) El cliente puede subir **documentos adicionales** con nombre
  propio (etiqueta "Adicional", máx. 60 por cliente).
- **Aviso a Daniela** cuando un cliente sube documentos (freno de 30 min).
- **Alerta diaria de vencimientos** (15/8/3 días y último día) al correo de
  avisos internos; timer interno + endpoint `GET /api/cron/alertas`
  (`CRON_SECRET`).
- **"Ya declaró"**: checkbox por cliente; excluido de alertas y envíos
  masivos. Colores del vencimiento por cercanía en la tabla de Clientes.
- Portal con header/footer de la marca y correo de avisos configurable en el
  panel (`correo_avisos`).

## 2026-07-09 — Guía de módulos y móvil (`71ffb88`, `7eb392c`)

- Vista guiada de los 5 módulos, menú hamburguesa con drawer en móvil,
  modales como hoja inferior, tablas compactas y corrección de desbordes.

## 2026-07-08 — Fase 2: portal de documentos (`395e0da`, `81139f9`)

- Portal por cliente con token HMAC sin estado (enlace `{{portal}}` en los
  correos), subida de archivos (multer, máx. 15 MB), estados
  pendiente/subido/aprobado/rechazado, pestaña Revisión con notificación del
  resultado por correo, e invitación al portal como correo aparte.

## 2026-07-05 a 07 — Fase 1: notificador (`4877162` y anteriores)

- Panel con login, clientes (CRUD + importación Excel/CSV), plantillas de
  documentos, calendario DIAN 2026 editable, correos de recordatorio con
  variables, historial de envíos. Canales de correo: Brevo (producción),
  SMTP genérico y Gmail (desarrollo). Despliegue en cPanel (Node.js
  App/Passenger) con `.env` por SFTP.
