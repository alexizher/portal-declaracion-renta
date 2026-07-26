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
                       Liquidador210, Login, ImportarExcel, Portal (página del cliente)
  src/vistas/liquidador210/  wizard del liquidador (Wizard, Paso*.jsx, conceptos.js)
  src/motor210/        motor de cálculo del Formulario 210 (ver §11)
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
| `TRUST_PROXY` | saltos de proxy confiables (defecto 1 = Passenger; 2 si Cloudflare proxy) |
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

**`.htaccess` del app root (solo en el servidor, NO está en el repo)**: además
de la config de Passenger y las env vars de CloudLinux (no tocar esos
bloques), al final tiene dos bloques agregados el 2026-07-17:
- `mod_headers`: replica las cabeceras de seguridad de `seguridad.js` y el
  caché de estáticos. Es necesario porque LiteSpeed sirve archivos existentes
  del app root directo, sin pasar por Node; sin él los assets salen sin
  cabeceras. Si se cambia la CSP en `seguridad.js`, actualizarla también aquí.
- `mod_rewrite`: **bloqueo crítico**. El app root ES el document root, así que
  LiteSpeed serviría directo cualquier archivo que exista en él sin pasar por
  Node — así quedaban expuestos por su ruta en disco los PDFs de clientes
  (`/uploads/...`), el código (`/src/...`, `/server.js`) y `stderr.log`. Las
  reglas `[F]` devuelven 403 en `uploads|src|scripts|cgi-bin|node_modules|tmp`,
  `server.js`, `package*.json`, `php.ini` y `*.log|*.env|*.map`. Los documentos
  legítimos solo salen por la API con token (`/api/...`, que lee del disco con
  `fs`, sin verse afectado por estas reglas). Desde el 2026-07-17 las subidas
  además viven FUERA del document root: `UPLOADS_DIR=/home/repolite/renta-uploads`
  en el `.env` de prod (directorio hermano del app root). El bloqueo `[F]` de
  `uploads` se mantiene como doble candado por si cPanel regenerara el
  `.htaccess` o algo volviera a escribir bajo la raíz web.

Editar el `.htaccess`: bajar por SFTP, editar, subir; **siempre guardar backup
antes** (un `.htaccess` malo deja el sitio en 500).

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

## 11. Liquidador 210 (`motor210`)

Pestaña "Liquidador 210" del panel — solo la usa la contadora, autenticada.
Calcula un borrador del Formulario 210 (renta personas naturales) a partir
de datos que ella digita leyendo la exógena y los soportes del cliente.
Fundamentación normativa completa (artículo por artículo del ET) y el
mapeo casilla por casilla en `docs/reglas-tributarias-AG2025.md`.

**Corre 100% en el navegador.** El servidor no participa en el cálculo ni
almacena nada de esto — ni la exógena, ni ingresos, ni patrimonio. La única
llamada al backend es `GET /api/clientes` (ya existente) para autocompletar
nombre por cédula; el resto vive y se autoguarda en `localStorage` del
navegador, por cédula (`f210:<cedula_norm>`).

```
client/src/motor210/
  redondeo.js, constantes/            utilidades y tablas (UVT, Art. 241 ET, cesantías escalonado)
  cedulas/{trabajo,honorariosServicios,capital,noLaboral}.js
                                       cada una: ingresos → INCRNGO → (costos) → renta líquida
  cascada.js                          topes compartidos entre cédulas (medicina/vivienda/ICETEX)
  exencionesDeducciones.js            tope combinado Art. 336 ET (1.340 UVT) + reparto en cascada
  dependientes.js                     Art. 387 ET (10%) y Art. 336 parágrafo (72 UVT × N)
  patrimonio.js, comparacionPatrimonial.js   Art. 236-239 ET
  impuesto.js, descuentos.js, retenciones.js, anticipo.js (Art. 807 ET)
  formulario210.js                    ensambla todo en las casillas del F210
  index.js                            liquidar(entrada) — orquesta el orden correcto entre módulos
  papelTrabajo.js                     genera el Excel descargable (memoria de cálculo)
  clasificarExogena.js                sugiere cédula/casilla por fila de exógena leyendo la
                                       columna "Uso declaración Sugerida" del propio reporte del
                                       MUISCA (no una tabla de códigos DIAN mantenida a mano) +
                                       palabras clave del "Detalle" para el campo específico.
                                       Conservador a propósito: lo que no reconoce con confianza
                                       queda en "sin clasificar" para digitar a mano, nunca
                                       adivina. OJO: los exports reales del MUISCA pueden traer
                                       el "!ref" (rango) de la hoja dañado/desactualizado —
                                       PasoExogena.jsx lo recalcula desde las celdas reales antes
                                       de convertir a filas, o SheetJS trunca los datos en silencio.
  __fixtures__ / *.test.js            Vitest — validado contra cifras reales de un cliente AG2024
                                       (anonimizadas) extraídas del .xlsm que usaba la contadora
client/src/vistas/liquidador210/
  Wizard.jsx                          orquesta los 5 pasos, autoguardado, carga cliente por cédula
  PasoExogena.jsx                     visor de solo lectura del Excel de exógena (sin clasificar)
  PasoCedulas.jsx, PasoPatrimonio.jsx, PasoResultado.jsx
  conceptos.js, estadoInicial.js, campos.jsx
```

**Cédula general con 4 sub-cédulas simultáneas**: trabajo, honorarios y
servicios (2+ trabajadores contratados), capital y no laboral se llenan
todas para el mismo cliente si aplica (ej. asalariado con ingresos
adicionales independientes) — no son mutuamente excluyentes.

**Alcance de esta temporada** (documentado y deliberado, no accidental):
pensiones, dividendos, ganancias ocasionales, venta de activos/acciones,
Impuesto al Patrimonio (F420), renta presuntiva (confirmado 0% desde Ley
2277/2022, se omite), patrimonio detallado activo-por-activo (se captura
por categoría), clasificación automática de exógena (el `.xlsm` de
referencia tampoco la hacía — es 100% digitación manual, igual que aquí).

**Antes de usar con clientes reales**: validar 2-3 declaraciones de la
temporada en paralelo contra el proceso anterior de la contadora, casilla
por casilla (gate F7 del plan de implementación) — un error de cálculo
tiene consecuencias reales frente a la DIAN.

**Cómo extender una cédula**: cada módulo en `cedulas/` recibe `input` (los
valores digitados) y `ctx` (UVT, topes compartidos disponibles) y devuelve
`{ingresosBrutos, incrngo, rentaLiquida, baseExentasYDeduccionesLimitadas,
...}` sin redondear (el redondeo a la unidad de mil, Art. 577 ET, solo pasa
en `formulario210.js` al ensamblar las casillas — redondear antes acumula
diferencias frente al `.xlsm` de referencia, ver los comentarios en
`cedulas/trabajo.js`). Para agregar un concepto nuevo: sumarlo en el
cálculo del módulo, agregarlo a `conceptos.js` con su cita del ET, y a
`estadoInicial.js` con valor 0.
