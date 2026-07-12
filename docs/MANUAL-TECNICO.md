# Manual técnico — Portal de declaración de renta

Guía para cualquier desarrollador que deba mantener o extender la aplicación.
Complementa el [README](../README.md) (instalación y operación) y el
[CHANGELOG](../CHANGELOG.md) (historial).

## 1. Visión general

Aplicación para una contadora (Daniela) que gestiona declaraciones de renta de
personas naturales en Colombia:

- **Panel de administración** (con login): clientes, plantillas de documentos,
  calendario DIAN, correos masivos, revisión de documentos y entregas.
- **Portal del cliente** (sin login, por enlace personal): sube sus documentos,
  deja su clave DIAN, edita su contacto y descarga sus soportes finales.
- **Correos**: recordatorios/invitaciones/novedades a clientes y avisos
  internos automáticos a la contadora.

## 2. Stack y estructura

| Capa | Tecnología |
|------|------------|
| Backend | Node.js 20 + Express 4, MySQL/MariaDB (`mysql2/promise`), multer, nodemailer |
| Frontend | React 18 + Vite, CSS propio (sin framework), un solo bundle |
| Hosting | cPanel compartido (LiteSpeed + Passenger, "Setup Node.js App"), sin shell |
| Correo | Brevo API HTTPS (producción) > SMTP genérico > Gmail (desarrollo) |

```
server/
  server.js            arranque: dotenv (override:true), db.init(), scheduler de alertas
  src/
    app.js             TODAS las rutas Express (portal, api admin, cron, estáticos)
    auth.js            login del panel + tokens HMAC (panel y portal)
    db.js              pool MySQL, DDL de tablas y migraciones automáticas
    datos.js           capa de acceso a datos (todo el SQL vive aquí)
    correo.js          canales de envío, render de plantillas, envíos masivos
    avisos.js          avisos internos a la contadora (subidas y vencimientos)
    archivos.js        multer: subida, borrado y rutas de archivos en disco
    cifrado.js         AES-256-GCM para la clave DIAN (DATA_SECRET)
    turnstile.js       verificación Cloudflare Turnstile (opcional)
    seed.js            datos iniciales: calendario DIAN, plantillas, config
  public/              frontend compilado (gitignored; se sube por SFTP)
  uploads/{clienteId}/ archivos subidos (gitignored, fuera de public)
client/
  src/main.jsx         enrutado mínimo: /portal[/token] → Portal, resto → App
  src/App.jsx          panel: barra, pestañas, guía
  src/api.js           fetch con Bearer token: api(), apiArchivo(), apiFormulario()
  src/Turnstile.jsx    widget + configPublica()
  src/vistas/          Clientes, Correos, Revision, Plantillas, Calendario,
                       Login, ImportarExcel, Portal (página del cliente)
  src/styles.css       todos los estilos (paleta DM en :root)
```

**Convención**: código y comentarios en español; los comentarios explican el
"por qué" (restricciones del hosting, decisiones de diseño).

## 3. Base de datos

Sin ORM ni archivos de migración: `db.init()` crea las tablas con
`CREATE TABLE IF NOT EXISTS` y aplica migraciones puntuales consultando
`information_schema` (idempotentes, corren en cada arranque).

| Tabla | Contenido | Detalles |
|-------|-----------|----------|
| `clientes` | datos del cliente | `cedula_norm` (solo dígitos, UNIQUE), `plantilla_id`, `declarado` (0/1), `dian_clave` (blob base64 cifrado) + `dian_actualizado` |
| `plantillas` | listas de documentos | `documentos` es un JSON array de strings |
| `calendario` | vencimientos DIAN | `digitos` JSON (p. ej. `[1,2]`) → `fecha`; el vencimiento se calcula con los 2 últimos dígitos de la cédula (`vencimientos.js`) |
| `config` | clave→valor | plantillas de correo, remitente, `correo_avisos`; las claves nuevas de `seed.js` llegan solas con INSERT IGNORE |
| `documentos` | subidas del cliente | UNIQUE (cliente, sha1(nombre)); estados `subido→aprobado/rechazado`; los nombres fuera de la plantilla son "adicionales" |
| `entregas` | archivos que sube el panel PARA el cliente | PK (cliente_id, tipo); tipos `declaracion\|anexo\|recibo` |
| `envios` | historial de correos | `tipo`: recordatorio, portal, novedades, revision, aviso-subida, alerta-vencimiento, recuperacion; también sirve de **candado anti-duplicados** (`hayEnvioDesde`) |

Las fechas se guardan en hora de Bogotá (`ahoraBogota()`, formato sv-SE),
no en UTC: el historial se muestra tal cual.

## 4. Autenticación y seguridad

Todo es **sin estado** porque Passenger corre/reinicia varios procesos (las
sesiones en memoria daban 401 intermitentes):

- **Panel**: `POST /api/login` valida `ADMIN_PASSWORD` (comparación en tiempo
  constante + bloqueo tras 5 intentos) y emite `expiracion.HMAC` (12 h),
  firmado con una llave derivada de `ADMIN_PASSWORD`. `requiereAuth` lo exige
  como `Bearer` en todo `/api/*` salvo login, portal y cron.
- **Portal del cliente**: enlace tipo *magic link* permanente
  `/portal/{clienteId.HMAC}` (`auth.js: tokenPortal`). No expira; cambiar
  `ADMIN_PASSWORD` invalida todos los enlaces.
- **Recuperar enlace**: `POST /api/portal/recuperar` con la cédula → reenvía
  el enlace **solo al correo registrado**. Respuesta siempre genérica
  (anti-enumeración) y freno de 15 min por cliente vía tabla `envios`.
- **Turnstile** (opcional): con `TURNSTILE_SECRET` definido, el login y la
  recuperación exigen el token del widget (verificado contra `siteverify`).
  El site key se publica en `GET /api/portal/publico/config`. Si Cloudflare
  no responde, se deja pasar (no bloquear usuarios por una caída externa).
- **Clave DIAN**: cifrada en reposo con AES-256-GCM (`cifrado.js`); llave =
  sha256(`renta-datos:` + `DATA_SECRET`). El blob guarda `iv|authTag|datos` en
  base64. **El portal nunca la devuelve**; solo el panel autenticado la
  descifra. `DATA_SECRET` es independiente de `ADMIN_PASSWORD` a propósito
  (rotar el login no pierde datos). **No cambiar `DATA_SECRET`**: lo cifrado
  queda ilegible.
- **Archivos**: viven fuera de `public/`, con nombre aleatorio en disco; solo
  salen por la API del panel o por los endpoints de entrega del portal
  (protegidos por el token del cliente). Extensiones permitidas y máx. 15 MB
  en `archivos.js`.
- **Cron**: `GET /api/cron/alertas?clave=CRON_SECRET`, registrado en el router
  ANTES de `requiereAuth`; sin `CRON_SECRET` queda deshabilitado.

## 5. Correo

`correo.js > enviarCorreo()` elige el canal por prioridad:
`BREVO_API_KEY` (API HTTPS) → `SMTP_HOST` → Gmail (`GMAIL_USER` +
`GMAIL_APP_PASSWORD`). En este hosting **solo funciona Brevo** (el filtro
saliente rechaza todo SMTP local y bloquea SMTP externo; ver README).

- **Mensajes masivos** (pestaña Correos, plantillas editables en `config`):
  `recordatorio`, `portal` (invitación), `novedades`. Variables:
  `{{nombre}} {{vencimiento}} {{digitos}} {{documentos}} {{remitente}}
  {{portal}} {{recuperar}}`. `enviarLote` va en serie con pausa de 1.5 s y
  omite clientes con advertencias (sin correo, sin plantilla, sin fecha o
  marcados "ya declaró").
- **Generados en código** (paleta DM inline): resultado de revisión
  (`renderCorreoRevision`), reenvío de enlace (`enviarEnlacePortal`) y los
  avisos internos (`avisos.js`).
- **Avisos internos** (solo al correo `config.correo_avisos`, el de la
  contadora — los clientes NUNCA los reciben):
  - `avisarSubida`: al subir un cliente documentos; freno de 30 min por
    cliente (consulta `envios`).
  - `revisarVencimientos`: alerta diaria con los clientes que llegan a un
    hito (faltan 15/8/3 días o vencen hoy), excluyendo `declarado`.
    Disparadores: timer cada 30 min en `server.js` (7am–9pm Bogotá) y el
    endpoint de cron (que además despierta la app). Candado por día en
    `envios`, así que da igual cuántos procesos/disparadores corran.

## 6. Flujo del portal del cliente

1. Recibe la invitación con su enlace `{{portal}}`.
2. Sube cada documento de su lista; puede **agregar documentos adicionales**
   con nombre libre (`extra=1`, 3–120 chars, máx. 60 docs).
3. Deja su **clave DIAN** (tarjeta con candado) y mantiene su **correo y
   celular** al día (lápiz junto al saludo).
4. El panel revisa: aprueba o rechaza con motivo → botón "Enviar resultado por
   correo". Reemplazar un archivo lo devuelve a "en revisión" y borra el
   anterior; un documento aprobado no se puede reemplazar desde el portal.
5. La contadora sube los **documentos finales** (declaración/anexo/recibo) →
   el cliente los descarga; subir la declaración marca `declarado=1`.
6. Si pierde el enlace: `/portal` → cédula → reenvío al correo registrado.

## 7. Endpoints principales

Públicos (sin login del panel):

| Método y ruta | Uso |
|---|---|
| `POST /api/login` | login del panel (+ token Turnstile si está activo) |
| `GET /api/portal/publico/config` | site key de Turnstile (o null) |
| `POST /api/portal/recuperar` | reenvío del enlace por cédula |
| `GET /api/portal/:token` | checklist + vencimiento + dian + entregas |
| `POST /api/portal/:token/documentos` | subir archivo (`nombre`, `archivo`, `extra`) |
| `PUT /api/portal/:token/perfil` | actualizar correo/celular |
| `POST /api/portal/:token/dian` | guardar clave DIAN (se cifra) |
| `GET /api/portal/:token/entrega/:tipo` | descargar documento final |
| `GET /api/cron/alertas?clave=…` | dispara la alerta diaria |

Del panel (Bearer token): CRUD de `/api/clientes`, `/api/plantillas`,
`/api/calendario`, `/api/config`; revisión (`/api/documentos/...`,
`/api/clientes/:id/documentos`); correos (`/api/correos/...`); clave DIAN
(`GET|DELETE /api/clientes/:id/dian`); entregas
(`POST|GET|DELETE /api/clientes/:id/entrega/:tipo`).

## 8. Variables de entorno

Ver `server/.env.example` (comentado). Resumen:

| Variable | Uso |
|---|---|
| `ADMIN_PASSWORD` | login del panel; firma de TODOS los tokens (cambiarla invalida enlaces del portal) |
| `DB_HOST/PORT/NAME/USER/PASSWORD` | MySQL (en este hosting: solo alfanuméricas) |
| `BREVO_API_KEY`, `SMTP_*`, `GMAIL_*` | canal de correo (prioridad en ese orden) |
| `FROM_EMAIL`, `REPLY_TO` | remitente visible y dirección de respuestas |
| `BASE_URL` | URL pública; arma `{{portal}}`, `{{recuperar}}` y el logo de los correos |
| `CRON_SECRET` | habilita `GET /api/cron/alertas` |
| `TURNSTILE_SITE_KEY/SECRET` | anti-robots en login y recuperación |
| `DATA_SECRET` | cifrado de la clave DIAN (no rotar) |
| `UPLOADS_DIR`, `PORT` | opcionales |

## 9. Desarrollo local y despliegue

**Local**: `server/scripts/db-local.sh` levanta MariaDB en podman
(127.0.0.1:3307); `npm run dev` en `server/` y `client/` (Vite proxy `/api`).
El build (`npm run build` en client/) escribe en `server/public/`.

**Producción** (cPanel sin shell — todo por SFTP, host `repolite`, carpeta
`declaraciones-renta-pn.repolite.link/`):

1. Compilar el frontend.
2. Subir por SFTP los `.js` cambiados de `src/`, `server.js` si cambió, y
   `public/` (index.html + assets nuevos; borrar los bundles viejos).
3. El `.env` de producción también se sube por SFTP (NO usar las Environment
   variables del panel de cPanel: son poco confiables). **Cuidado**: puede no
   terminar en newline; al anexar variables, anteponer `\n`.
4. Reiniciar subiendo un archivo (vacío o no) a `tmp/restart.txt`. Passenger
   tarda 20–30 s en reciclar; **verificar con un endpoint de la API**, no con
   los estáticos (LiteSpeed los sirve sin pasar por Node).
5. Si hay dependencias npm nuevas: subir las carpetas de `node_modules`
   afectadas con `scp -r` (usa protocolo SFTP).

**Gotchas del hosting**: contraseñas solo alfanuméricas en el `.env`;
`connectionLimit: 4` en MySQL; el editor de archivos de cPanel mete saltos de
línea fantasma; los correos por SMTP local son rechazados como spam por el
filtro del proveedor (por eso Brevo); `stderr.log` acumula errores viejos sin
timestamp.

## 10. Cómo extender

- **Nueva plantilla de correo masivo**: agregar claves en `seed.js`
  (CONFIG_INICIAL llega sola a prod), registrar el tipo en
  `correo.js > CLAVES_TIPO`, en `app.js > TIPOS_MENSAJE`, en el `PUT /config`
  y en `Correos.jsx > MENSAJES`.
- **Nueva variable de plantilla**: agregarla a `reemplazos` en
  `correo.js > renderCorreo` y documentarla en la ayuda de `Correos.jsx`.
- **Nuevo tipo de entrega**: sumar el tipo a `datos.js > TIPOS_ENTREGA`,
  `Revision.jsx > ENTREGAS_DEF` y `Portal.jsx > ENTREGA_TITULOS`.
- **Nueva migración**: patrón en `db.js > init()` — consultar
  `information_schema.columns` y aplicar `ALTER` solo si falta.
- **Nuevo aviso interno**: seguir el patrón de `avisos.js` (dedupe con
  `datos.hayEnvioDesde` + registro en `envios` con un `tipo` nuevo + etiqueta
  en `Correos.jsx > TIPO_TEXTO`).
