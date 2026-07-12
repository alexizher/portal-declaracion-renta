# Changelog

Historial de cambios del portal de declaración de renta. Fechas en hora de
Colombia; los hashes referencian los commits en `main`.

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
