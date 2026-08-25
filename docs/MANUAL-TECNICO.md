# Manual técnico — Portal de declaración de renta

Referencia operativa para quien mantiene la aplicación: endpoints, variables
de entorno, despliegue y cómo extender cada pieza.

- **[ARQUITECTURA.md](ARQUITECTURA.md)** — diagramas, patrones de diseño,
  modelo de datos y flujos. **Empieza por ahí si es tu primer día en el proyecto.**
- [MANUAL-USUARIO.md](MANUAL-USUARIO.md) — cómo se usa el sistema
- [reglas-tributarias-AG2025.md](reglas-tributarias-AG2025.md) — fundamentación normativa del Liquidador
- [README](../README.md) · [CHANGELOG](../CHANGELOG.md)

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
| Hosting | cPanel compartido (LiteSpeed + Passenger, "Setup Node.js App") **con shell SSH** |
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
    seguridad.js       cabeceras HTTP + limitador de peticiones (sin dependencias)
    vencimientos.js    cédula → fecha DIAN según el calendario
  scripts/             db-local.sh (MariaDB en podman), migrar-json.js
  public/              frontend compilado (gitignored; se copia con scp)
  uploads/{clienteId}/ archivos subidos (gitignored, fuera de public; en prod
                       viven en UPLOADS_DIR, fuera del document root)
client/
  src/main.jsx         enrutado mínimo: /portal[/token] → Portal, resto → App
  src/App.jsx          panel: barra, pestañas, guía
  src/api.js           fetch con Bearer token: api(), apiArchivo(), apiFormulario()
  src/Turnstile.jsx    widget + configPublica()
  src/vistas/          Clientes, Correos, Revision, Plantillas, Calendario,
                       Liquidador210, Login, ImportarExcel, Portal (página del cliente)
  src/vistas/Legal.jsx páginas públicas /terminos y /privacidad
  src/vistas/liquidador210/  wizard del liquidador (Wizard, los 9 Paso*.jsx,
                       conceptos.js, estadoInicial.js, campos.jsx) + los Anexos
                       en PDF (anexos.js, AnexosDeclaracion.jsx, AnexosPDF.jsx)
  src/motor210/        motor de cálculo del Formulario 210 (ver §11)
  src/styles.css       todos los estilos (paleta DM en :root)
```

**Convención**: código y comentarios en español; los comentarios explican el
"por qué" (restricciones del hosting, decisiones de diseño).

Los diagramas de esta arquitectura — capas del backend, árbol de componentes
del frontend, cadena de middleware — están en
[ARQUITECTURA.md §3 y §4](ARQUITECTURA.md#3-backend).

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
| `liquidaciones210` | estado completo del Liquidador | PK `cedula_norm` (**no** `clientes.id`: se liquida también para cédulas que aún no son clientes del portal); `datos_cifrados` es el estado del Wizard en AES-256-GCM (§11) |

Las fechas se guardan en hora de Bogotá (`ahoraBogota()`, formato sv-SE),
no en UTC: el historial se muestra tal cual.

Diagrama entidad-relación completo y las decisiones de modelado (por qué no
hay `FOREIGN KEY`, por qué `nombre_hash`, por qué `envios` es candado) en
[ARQUITECTURA.md §5](ARQUITECTURA.md#5-modelo-de-datos).

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
- **Datos cifrados en reposo** (`cifrado.js`, AES-256-GCM): la **clave DIAN**
  del cliente y el **estado completo del Liquidador 210**
  (`liquidaciones210.datos_cifrados`). El servidor guarda un blob que no
  puede interpretar sin `DATA_SECRET`. Detalle de la clave DIAN: llave =
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
- **Cabeceras y rate limit** (`seguridad.js`, sin dependencias): middleware
  `cabeceras` en toda respuesta — CSP (`'self'` + `challenges.cloudflare.com`
  para el widget Turnstile; `style-src 'unsafe-inline'` porque la preview de
  correos pinta HTML con estilos inline), `X-Frame-Options: DENY`,
  `nosniff`, `Referrer-Policy: no-referrer` (los enlaces del portal llevan el
  token en la URL), `Permissions-Policy`, COOP/CORP y HSTS (1 año, solo sobre
  HTTPS). Caché: `no-store` en todo `/api`, `no-cache` en `index.html`/logos,
  `immutable` 1 año en los assets con hash de Vite. `limitador()` es un rate
  limit de ventana fija en memoria por IP (requiere `trust proxy`, ver
  `TRUST_PROXY`): 10/15 min en login y recuperar enlace, 60/10 min en subidas
  del portal, 120/5 min en el portal y 600/5 min en el API. Con varios
  procesos de Passenger los contadores son por proceso (límite efectivo algo
  más holgado).

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

Del panel (Bearer token en todo `/api/*`):

| Método y ruta | Uso |
|---|---|
| `GET\|POST\|PUT\|DELETE /api/clientes[/:id]` | CRUD de clientes |
| `POST /api/clientes/importar` | importación masiva desde Excel/CSV |
| `GET\|POST\|PUT\|DELETE /api/plantillas[/:id]` | listas de documentos por perfil |
| `GET\|PUT /api/calendario` | vencimientos DIAN |
| `GET\|PUT /api/config` | plantillas de correo, remitente, `correo_avisos` |
| `GET /api/documentos/resumen` | contadores "por revisar" de la pestaña Revisión |
| `GET /api/clientes/:id/documentos` | checklist armado + enlace del portal |
| `GET /api/documentos/:id/archivo` | descarga del archivo del cliente |
| `PUT /api/documentos/:id/revision` | aprobar / rechazar con motivo |
| `POST /api/clientes/:id/notificar-revision` | envía el correo de resultado |
| `GET\|DELETE /api/clientes/:id/dian` | ver / borrar la clave DIAN descifrada |
| `POST\|GET\|DELETE /api/clientes/:id/entrega/:tipo` | documentos finales (`declaracion\|anexo\|recibo`) |
| `GET\|PUT /api/liquidaciones210/:cedula` | estado cifrado del Liquidador (503 sin `DATA_SECRET`) |
| `GET /api/correos/previsualizar/:clienteId` | vista previa con datos reales |
| `GET /api/correos/verificar` | diagnostica el canal de correo **sin enviar** |
| `POST /api/correos/enviar` | envío masivo por lote |
| `GET /api/correos/historial` | historial de la tabla `envios` |

Los diagramas de secuencia de los flujos críticos (login, subida de un
documento, alerta diaria, autoguardado del Liquidador, revisión, recuperación
del enlace) están en
[ARQUITECTURA.md §7](ARQUITECTURA.md#7-flujos-críticos-secuencias).

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
| `TRUST_PROXY` | saltos de proxy confiables (defecto 1 = Passenger; 2 si Cloudflare proxy) |
| `UPLOADS_DIR`, `PORT` | opcionales |

## 9. Desarrollo local y despliegue

### Local

`server/scripts/db-local.sh` levanta MariaDB en podman (127.0.0.1:3307);
`npm run dev` en `server/` y en `client/` (Vite hace proxy de `/api`). El build
(`npm run build` en `client/`) escribe directamente en `server/public/`.

### Producción — acceso SSH

El servidor tiene **shell SSH completo** (alias `repolite` en `~/.ssh/config`).
Datos de la instalación:

| Dato | Valor |
|---|---|
| Host / usuario | `repolite` → `repolite@hacemosmemoria.repolite.link` |
| App root (= document root) | `~/declaraciones-renta-pn.repolite.link/` |
| Uploads | `~/renta-uploads/` (**fuera** del app root) |
| Node 20 | virtualenv de CloudLinux, hay que **activarlo** (ver abajo) |
| URL pública | `https://declaraciones-renta-pn.repolite.link` |

**`node` y `npm` no están en el `PATH` por defecto.** Los pone el virtualenv
del Node Selector:

```bash
source ~/nodevenv/declaraciones-renta-pn.repolite.link/20/bin/activate
cd ~/declaraciones-renta-pn.repolite.link
node -v   # v20.20.2
npm -v    # 10.8.2
```

Disponible en el servidor: `git`, `mysql`, `mysqldump`, `crontab`, `curl`,
`zip`, `unzip`, `tail`. **No hay `rsync`** — para copiar se usa `scp`.

### Desplegar

```bash
APP=~/declaraciones-renta-pn.repolite.link

# 1. Compilar el frontend (en local) — escribe en server/public/
cd client && npm run build && cd ..

# 2. Copiar backend y frontend compilado
scp server/server.js repolite:$APP/
scp server/src/*.js  repolite:$APP/src/
scp -r server/public/. repolite:$APP/public/

# 3. Borrar los bundles viejos de Vite (los nuevos llevan otro hash)
ssh repolite "cd $APP/public/assets && ls -t | tail -n +3 | xargs -r rm --"

# 4. Solo si cambiaron las dependencias
ssh repolite "source ~/nodevenv/declaraciones-renta-pn.repolite.link/20/bin/activate \
  && cd $APP && npm install --omit=dev"

# 5. Reiniciar Passenger
ssh repolite "touch $APP/tmp/restart.txt"

# 6. Verificar (Passenger tarda 20–30 s en reciclar)
curl -s -o /dev/null -w '%{http_code}\n' \
  https://declaraciones-renta-pn.repolite.link/api/portal/publico/config
```

> **Verificar siempre contra un endpoint del API, nunca contra un
> estático.** LiteSpeed sirve los archivos que existen en el app root sin
> pasar por Node: un `index.html` que responde 200 no prueba que la app
> reinició.

> El paso 3 no es opcional: `public/assets/` acumula los bundles de cada
> despliegue. Revisa qué queda antes de borrar si no estás seguro.

### El `.env` de producción

Vive en el app root y **no está en el repo**. Se edita directamente por SSH
(`nano`/`vi`) o se sube con `scp`.

**No usar las "Environment variables" del panel de cPanel**: su editor no
siempre guarda y LiteSpeed altera los valores con caracteres especiales. Por
eso `server.js` carga el `.env` con `override: true`. Consecuencias prácticas:

- Contraseñas de base de datos **solo alfanuméricas**.
- El archivo puede no terminar en newline: al anexar variables, anteponer `\n`.
- Cuidado con el File Manager de cPanel: mete saltos de línea fantasma; un
  salto después del `=` deja la variable vacía.

### Operación por SSH

Cosas que ahora se hacen directo en el servidor:

```bash
# Ver los errores en vivo mientras se reproduce un problema
ssh repolite "tail -f ~/declaraciones-renta-pn.repolite.link/stderr.log"

# Respaldo de la base de datos antes de tocar algo
ssh repolite "mysqldump -u USUARIO -p NOMBRE_DB | gzip > ~/backup-$(date +%F).sql.gz"

# Consultar la base de datos
ssh repolite "mysql -u USUARIO -p NOMBRE_DB -e 'SELECT tipo, COUNT(*) FROM envios GROUP BY tipo'"

# Revisar el cron de las alertas
ssh repolite "crontab -l"

# Disparar la alerta de vencimientos a mano
ssh repolite "curl -s 'https://declaraciones-renta-pn.repolite.link/api/cron/alertas?clave=CRON_SECRET'"
```

> `stderr.log` acumula errores viejos **sin timestamp**: mira la cola, no el
> principio, y considera vaciarlo (`: > stderr.log`) antes de reproducir un
> fallo para que lo nuevo quede aislado.

### El `.htaccess` del app root

Está **solo en el servidor, no en el repo**. Además de la configuración de
Passenger y las env vars de CloudLinux (no tocar esos bloques), al final tiene
dos bloques agregados el 2026-07-17:

- **`mod_headers`**: replica las cabeceras de seguridad de `seguridad.js` y el
  caché de estáticos. Es necesario porque LiteSpeed sirve los archivos
  existentes del app root directo, sin pasar por Node; sin él los assets salen
  sin cabeceras. **Si se cambia la CSP en `seguridad.js`, actualizarla también
  aquí.**
- **`mod_rewrite`**: bloqueo crítico. El app root **es** el document root, así
  que LiteSpeed serviría directo cualquier archivo que exista en él — así
  quedaban expuestos por su ruta en disco los PDFs de clientes
  (`/uploads/...`), el código (`/src/...`, `/server.js`) y `stderr.log`. Las
  reglas `[F]` devuelven 403 en
  `uploads|src|scripts|cgi-bin|node_modules|tmp`, `server.js`, `package*.json`,
  `php.ini` y `*.log|*.env|*.map`. Los documentos legítimos solo salen por la
  API con token (`/api/...`, que lee del disco con `fs`, sin verse afectado por
  estas reglas).

Desde el 2026-07-17 las subidas además viven **fuera** del document root
(`UPLOADS_DIR=/home/repolite/renta-uploads`, directorio hermano del app root).
El bloqueo `[F]` de `uploads` se mantiene como **doble candado** por si cPanel
regenerara el `.htaccess` o algo volviera a escribir bajo la raíz web.

Al editarlo, **guardar backup antes** — un `.htaccess` malo deja el sitio en 500:

```bash
ssh repolite "cd ~/declaraciones-renta-pn.repolite.link \
  && cp .htaccess .htaccess.bak-$(date +%F) && nano .htaccess"
```

### Gotchas del hosting

- Contraseñas **solo alfanuméricas** en el `.env`.
- `connectionLimit: 4` en el pool de MySQL (cPanel limita conexiones por cuenta).
- Passenger corre **varios procesos** y los recicla: nada de estado en memoria.
- Los correos por SMTP local los rechaza el filtro del proveedor como spam
  (`550 classified as SPAM`) — por eso se usa la API HTTPS de Brevo.
- `node`/`npm` requieren activar el virtualenv en **cada** sesión SSH.
- No hay `rsync`.

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
- **Nueva pestaña del panel**: una fila en `App.jsx > PESTANAS`
  (`{ id, titulo, Vista }`) y, si conviene, un paso en `Guia.jsx > PASOS`.
- **Nuevo paso del Liquidador**: una fila en `Wizard.jsx > PASOS` + el
  `Paso*.jsx` + los campos en `estadoInicial.js` con valor 0.
- **Nuevo endpoint**: definirlo en `app.js` (validación y orquestación) y el
  SQL en `datos.js`. **Nunca escribir SQL fuera de `datos.js`.** Si va bajo
  `/api/portal`, recordar que ese router se registra ANTES que `/api`.
- **Nuevo dato sensible**: cifrarlo con `cifrado.js` y decidir explícitamente
  quién lo puede descifrar (el patrón de la clave DIAN: el portal nunca la
  devuelve; solo el panel autenticado).

El catálogo de patrones de diseño aplicados —con el archivo donde vive cada uno
y el problema que resuelve— está en
[ARQUITECTURA.md §9](ARQUITECTURA.md#9-patrones-de-diseño-aplicados).

## 11. Liquidador 210 (`motor210`)

Pestaña "Liquidador 210" del panel — solo la usa la contadora, autenticada.
Calcula un borrador del Formulario 210 (renta personas naturales) a partir de
datos que ella digita leyendo la exógena y los soportes del cliente.

- Fundamentación normativa (artículo por artículo del ET) y mapeo casilla por
  casilla: [reglas-tributarias-AG2025.md](reglas-tributarias-AG2025.md).
- Diagrama de módulos, pipeline de `liquidar()` y flujo de persistencia:
  [ARQUITECTURA.md §6 y §7.4](ARQUITECTURA.md#6-motor-de-cálculo-motor210).

### Dónde corre y dónde se guarda

**El cálculo es 100 % del navegador.** El servidor no participa: no ve la
exógena, ni ingresos, ni patrimonio. Solo hace dos cosas:

1. `GET /api/clientes` — autocompletar el nombre por cédula.
2. `GET|PUT /api/liquidaciones210/:cedula` — guardar y recuperar el estado del
   Wizard **cifrado con AES-256-GCM** (`cifrado.js`), para poder continuar la
   misma declaración desde otro computador. El servidor almacena un blob que no
   puede interpretar. Sin `DATA_SECRET` estos endpoints responden 503 y el
   Liquidador sigue funcionando solo en local.

La persistencia es **local-first** y nunca bloquea:

| Momento | Qué pasa |
|---|---|
| Cada cambio | `localStorage` inmediato, clave `f210:<cedula_norm>` |
| 1,5 s después (debounce) | `PUT` cifrado al servidor; indicador *guardando / guardado / error* |
| Al cargar una cédula | servidor → `localStorage` (y **migra** al servidor) → tabla `clientes` → en blanco |
| Si el `PUT` falla | El indicador muestra "error"; el caso sigue íntegro en el navegador |

### Estructura

```
client/src/motor210/
  redondeo.js                         noNegativo, redondearMiles (Art. 577 ET)
  constantes/                         uvt.js, tablaImpuesto241.js (Art. 241 ET),
                                      tablaArt73.js, tablaDividendos2016.js,
                                      cesantiasEscalonado.js
  cedulas/trabajo.js                  Art. 206-10: renta exenta del 25 %
  cedulas/honorariosServicios.js      con 2+ trabajadores contratados
  cedulas/capital.js                  componente inflacionario
  cedulas/noLaboral.js
  cedulas/pensiones.js                tope propio de 12.000 UVT — fuera de la cascada
  cedulas/dividendos.js               tarifa plana propia + subcédulas 2016
  cascada.js                          topes compartidos (medicina/vivienda/ICETEX)
  exencionesDeducciones.js            tope combinado Art. 336 ET (1.340 UVT)
  dependientes.js                     Art. 387 ET (10 %) y Art. 336 par. (72 UVT × N)
  gananciaOcasional.js                Art. 299 y ss. — base y tarifa propias
  patrimonio.js                       activos por categoría − deudas
  reajusteFiscal.js                   Art. 70 y 73 ET, activo por activo
  comparacionPatrimonial.js           Art. 236-239 ET (diagnóstico)
  impuesto.js, descuentos.js, retenciones.js, anticipo.js (Art. 807 ET)
  impuestoDividendos.js, identificacion.js, etiquetasCasillas.js
  formulario210.js                    ensambla las casillas + redondeo Art. 577
  index.js                            liquidar(entrada) — orquesta el orden
  papelTrabajo.js                     Excel de memoria de cálculo
  formularioDianExcel.js              Excel casilla por casilla
  clasificarExogena.js                sugiere cédula/casilla por fila de exógena
  *.test.js                           Vitest — 156 pruebas en 20 archivos
client/src/vistas/liquidador210/
  Wizard.jsx                          los 9 pasos, autoguardado, carga por cédula
  PasoExogena.jsx                     visor de solo lectura del Excel de exógena
  PasoCedulas.jsx PasoGananciaOcasional.jsx PasoPatrimonio.jsx
  PasoAnticipo.jsx PasoImpuesto.jsx PasoFormulario210.jsx PasoResultado.jsx
  anexos.js AnexosDeclaracion.jsx AnexosPDF.jsx   PDF vectorial de anexos
  conceptos.js estadoInicial.js campos.jsx
```

### Cédula general con 4 sub-cédulas simultáneas

Trabajo, honorarios y servicios, capital y no laboral **no son mutuamente
excluyentes**: se llenan todas las que apliquen al mismo cliente (p. ej. un
asalariado con ingresos adicionales independientes). Pensiones, dividendos y
ganancia ocasional van aparte — cada una con su propio tope o tarifa, fuera de
la cascada de la cédula general.

### Reglas al tocar el motor

1. **No redondear antes de `formulario210.js`.** El redondeo a la unidad de mil
   (Art. 577 ET) pasa solo al ensamblar las casillas; redondear en cada módulo
   acumula diferencias contra el `.xlsm` de referencia (ver los comentarios en
   `cedulas/trabajo.js`).
2. **La cascada de topes es un orden, no un conjunto**: trabajo → honorarios →
   capital → no laboral. Medicina solo entre trabajo y honorarios; vivienda e
   ICETEX entre las cuatro. Cambiar el orden cambia el resultado.
3. **La comparación patrimonial nunca se aplica sola.** Se muestra como
   advertencia y la casilla 96 solo se puebla si la contadora lo confirma
   (`incluirComparacionPatrimonial`), tras verificar con el cliente si hay
   activos omitidos o pasivos inexistentes.
4. **Las funciones son puras**: sin `fetch`, sin `localStorage`, sin
   `Date.now()`. Es lo que permite que 156 pruebas corran en 1,3 s sin mocks.

### `clasificarExogena.js`

Sugiere cédula y casilla leyendo la columna *"Uso declaración Sugerida"* del
propio reporte del MUISCA — no una tabla de códigos DIAN mantenida a mano — más
palabras clave del "Detalle" para el campo específico. Es **conservador a
propósito**: lo que no reconoce con confianza queda en "sin clasificar" para
digitar a mano, nunca adivina.

> Los exports reales del MUISCA pueden traer el `!ref` (rango) de la hoja
> dañado o desactualizado. `PasoExogena.jsx` lo recalcula desde las celdas
> reales antes de convertir a filas; sin eso, SheetJS **trunca los datos en
> silencio**.

### Alcance de esta temporada

Documentado y deliberado, no accidental:

| Fuera de alcance | Por qué |
|---|---|
| Renta presuntiva | Confirmada al 0 % desde la Ley 2277/2022 — se omite |
| Impuesto al Patrimonio (F420) | Es otro formulario |
| Venta de activos fijos y acciones con costo por activo | Se captura el total digitado; el sub-flujo detallado sigue pendiente |
| Clasificación automática de la exógena | El `.xlsm` de referencia tampoco la hacía: es digitación manual, igual que aquí |

El patrimonio se captura **por categoría**, con la excepción de los activos
fijos sujetos a reajuste fiscal (`reajusteFiscal.js`), que sí van activo por
activo porque el Art. 70/73 ET exige año de adquisición y tipo de bien.

### Salidas

| Archivo | Genera | Para qué |
|---|---|---|
| `papelTrabajo.js` | Excel | Memoria de cálculo: de dónde salió cada cifra |
| `formularioDianExcel.js` | Excel | Casilla por casilla, para pasar al MUISCA |
| `AnexosPDF.jsx` | PDF vectorial | Documento presentable para el cliente |

Los anexos usan `@react-pdf/renderer`, que compila internamente un motor de
layout (yoga) a **WebAssembly** embebido como `data:` URI. Por eso la CSP en
`seguridad.js` incluye `'wasm-unsafe-eval'` en `script-src` y `data:` en
`connect-src`. Sin esos dos permisos, "Descargar PDF" no hace nada y el error
solo aparece en la consola del navegador.

### Cómo extender una cédula

Cada módulo de `cedulas/` recibe `input` (los valores digitados) y `ctx` (UVT,
topes compartidos disponibles) y devuelve, **sin redondear**:

```js
{ ingresosBrutos, incrngo, rentaLiquida, baseExentasYDeduccionesLimitadas,
  medicinaLimitada, viviendaLimitada, icetexLimitado, advertencias }
```

Para agregar un concepto nuevo: sumarlo en el cálculo del módulo, agregarlo a
`conceptos.js` con su cita del ET, y a `estadoInicial.js` con valor 0. **Y
escribir su prueba** — es la única red de seguridad que tiene este motor.

### Gate pendiente

**Antes de usar con clientes reales**: validar 2-3 declaraciones de la
temporada en paralelo contra el proceso anterior de la contadora, casilla por
casilla. Un error de cálculo tiene consecuencias reales frente a la DIAN.
