# Portal Declaración de Renta

Sistema para gestión de clientes de declaración de renta (Colombia).

**Fase 1 — Notificador:** panel de administración para importar la lista de
clientes (Excel/CSV), calcular la fecha de vencimiento DIAN según los dos últimos
dígitos de la cédula/NIT, y enviarles por correo el recordatorio con la lista de
documentos que deben preparar.

**Fase 2 — Portal de documentos:** cada cliente recibe un enlace personal
(`/portal/{token}`, sin contraseña) donde sube los documentos de su lista. El
administrador los revisa desde la pestaña **Revisión** (aprobar / rechazar con
motivo) y, al terminar, envía con un botón el resumen por correo: qué quedó
aprobado y qué debe volver a subir.

## Estructura

```
server/   API Express (Node 20) + sirve el frontend compilado desde server/public
client/   Panel de administración y portal de clientes en React + Vite
```

Los datos viven en **MySQL/MariaDB** (tablas: clientes, plantillas, calendario,
config, envios, documentos). Las tablas se crean y se precargan solas al primer
arranque (incluidas las migraciones de columnas nuevas sobre tablas existentes).

## Portal de documentos (Fase 2)

- **Enlace del cliente:** cada cliente tiene un token HMAC sin estado
  (`clienteId.firma`, derivado de `ADMIN_PASSWORD`); no expira y cambiar
  `ADMIN_PASSWORD` invalida todos los enlaces. En el correo recordatorio se
  inserta con la variable `{{portal}}` (requiere `BASE_URL` en el `.env`); el
  panel también permite copiarlo desde la pestaña Revisión.
- **Archivos:** se guardan en `server/uploads/{clienteId}/` (configurable con
  `UPLOADS_DIR`), fuera de `public/`; solo salen por la API autenticada del
  panel. Tipos permitidos: PDF, imágenes (JPG/PNG/WebP/HEIC) y Office
  (doc/xls); máximo 15 MB. Reemplazar un archivo borra el anterior del disco y
  vuelve el documento al estado "en revisión".
- **Estados:** pendiente → subido (en revisión) → aprobado / rechazado (con
  motivo visible para el cliente). Un documento aprobado ya no se puede
  reemplazar desde el portal.
- **Notificación:** el correo de resultado (aprobados, por corregir, sin subir)
  se genera en el código con la paleta de la marca y se envía manualmente con
  el botón "Enviar resultado por correo"; queda en el historial con tipo
  `revision`.
- **Documentos adicionales:** el cliente puede subir archivos que no están en
  su lista con el botón "Agregar otro documento" del portal (nombre libre de
  3–120 caracteres, p. ej. varios certificados de deudas o cuentas). En el
  panel y en el portal se distinguen con la etiqueta "Adicional"; máximo 60
  documentos por cliente.

## Recuperar enlace y Turnstile

- **"¿Perdiste tu enlace?"**: en `/portal` (sin token) el cliente escribe su
  cédula y se le reenvía su enlace personal **al correo registrado** (nunca a
  uno que escriba él). La respuesta es genérica — no confirma si la cédula
  existe — y hay freno de 15 minutos por cliente (historial tipo
  `recuperacion`). La página de "enlace no válido" enlaza a este formulario.
- **Cloudflare Turnstile** (opcional): con `TURNSTILE_SITE_KEY` y
  `TURNSTILE_SECRET` en el `.env`, el login del panel y el formulario de
  recuperación exigen pasar la verificación anti-robots (widget en español,
  verificación server-side contra `siteverify`). Sin las variables, los
  formularios funcionan sin captcha. El frontend consulta el site key en
  `GET /api/portal/publico/config`.

## Avisos internos (Fase 3)

El correo destino se configura en el panel (pestaña Correos → "Avisos
internos"); vacío = deshabilitados. Quedan en el historial de envíos.

- **Aviso de subida** (`aviso-subida`): al subir un cliente documentos al
  portal se avisa por correo, con un freno de 30 minutos por cliente para no
  recibir un correo por cada archivo.
- **Alerta de vencimientos** (`alerta-vencimiento`): una vez al día se avisa
  qué clientes llegan a un hito de su plazo — faltan 15, 8 o 3 días, o vencen
  hoy — con colores por urgencia (rojo el último día). Los clientes marcados
  como **"ya declaró"** (checkbox al editar el cliente) no aparecen en la
  alerta ni reciben recordatorios/invitaciones masivas.
- **Disparadores de la alerta:** un timer interno cada 30 min (7 am–9 pm
  Bogotá, deduplicado por día contra la tabla `envios`) y el endpoint
  `GET /api/cron/alertas?clave=CRON_SECRET`, pensado para un Cron Job de
  cPanel a las 7 am con `curl` — además despierta la app si Passenger la
  durmió. Sin `CRON_SECRET` en el `.env`, el endpoint queda deshabilitado.
- En la pestaña **Clientes**, la fecha de vencimiento se colorea por
  cercanía: amarillo (≤15 días), naranja (≤8), rojo (≤3), rojo pleno el
  último día; los que ya declararon muestran "Declaró ✓".

## Desarrollo local

Requiere podman (o Docker) solo para la base de datos local:

```bash
# 1. Base de datos (contenedor MariaDB en 127.0.0.1:3307)
cd server
npm run db:local

# 2. Backend
cp .env.example .env   # editar: ADMIN_PASSWORD y el canal de correo
npm install
npm run dev            # http://localhost:3001

# 2. Frontend (otra terminal)
cd client
npm install
npm run dev            # http://localhost:5173 (proxy /api -> 3001)
```

## Envío de correo

Tres canales, en orden de prioridad (ver `.env.example`):

1. **Brevo (API HTTPS)** — el canal de **producción**. Se activa con `BREVO_API_KEY`.
   Necesario en el hosting porque su firewall bloquea SMTP externo y el filtro
   saliente rechaza el SMTP local de la aplicación (`550 classified as SPAM`).
   Requisitos en Brevo: remitente/dominio verificado (`FROM_EMAIL`) y la IP del
   servidor agregada en Security → Authorised IPs. Plan gratis: 300 correos/día.
2. **SMTP genérico** (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) — para
   cualquier proveedor SMTP accesible desde donde corra la app.
3. **Gmail** (`GMAIL_USER` + contraseña de aplicación) — solo desarrollo local.

`FROM_EMAIL` define el remitente visible y `REPLY_TO` la dirección que recibe
las respuestas de los clientes. Diagnóstico sin enviar: `GET /api/correos/verificar`.

La plantilla HTML del correo, el remitente (firma) y las listas de documentos por
perfil se editan desde el panel y viven en la base de datos, no en el código.

## Despliegue en el hosting (cPanel + Node.js Selector)

1. Crear la base de datos en cPanel → **MySQL Databases**: una DB, un usuario y
   asignarle todos los privilegios (cPanel antepone el prefijo de la cuenta,
   ej. `repolite_renta`).
2. Compilar el frontend: `cd client && npm run build` (queda en `server/public/`).
3. En cPanel → **Setup Node.js App**: crear la app con Node **20.20.2**, application
   root apuntando a la carpeta del proyecto, startup file `server.js`.
4. Subir por SFTP el contenido de `server/` (incluido `public/`, sin `node_modules`).
5. Subir por SFTP un archivo **`.env`** a la raíz de la app con: `ADMIN_PASSWORD`,
   `DB_HOST=localhost`, `DB_PORT=3306`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`,
   `BASE_URL` (URL pública, para los enlaces `{{portal}}`) y el
   canal de correo (ver sección anterior). **No** usar las "Environment variables"
   del panel: su editor no siempre guarda y LiteSpeed altera valores con caracteres
   especiales (`server.js` carga el `.env` con `override: true`). Por lo mismo,
   usar contraseñas **solo alfanuméricas** para la DB. Cuidado al editar con el
   File Manager: un salto de línea después del `=` deja la variable vacía.
6. Botón **Run NPM Install** (dependencias livianas: express, mysql2, nodemailer,
   multer, dotenv) y luego **Restart**. Las tablas se crean solas al arrancar.
7. Reinicios posteriores sin panel: subir cualquier archivo a `tmp/restart.txt`.

Si existían datos de la versión JSON (`server/data/*.json`), migrarlos con
`npm run migrar-json`.

## Calendario DIAN

El calendario 2026 (año gravable 2025) viene precargado: vencimientos del 12 de
agosto al 26 de octubre de 2026 por pares de dígitos. Es editable desde la pestaña
"Calendario DIAN"; verificar siempre contra el
[calendario oficial](https://www.dian.gov.co/Calendarios/Calendario_Tributario_2026.pdf).
