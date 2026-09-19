# Arquitectura — Portal de Declaración de Renta

Documento para desarrolladores. Explica **cómo está construido** el sistema:
infraestructura, backend, frontend, modelo de datos, patrones de diseño y los
flujos críticos, con diagramas.

- Referencia operativa (endpoints, `.env`, despliegue): [MANUAL-TECNICO.md](MANUAL-TECNICO.md)
- Manual de uso (para la contadora y sus clientes): [MANUAL-USUARIO.md](MANUAL-USUARIO.md)
- Fundamentación tributaria del Liquidador: [reglas-tributarias-AG2025.md](reglas-tributarias-AG2025.md)

### Cómo están hechos los diagramas

La vista **estructural** sigue el [modelo C4](https://c4model.com) de Simon
Brown, del contexto al código, y se dibuja con
[C4-PlantUML](https://github.com/plantuml-stdlib/C4-PlantUML). La vista
**dinámica** (secuencias, estados, flujos y el modelo entidad-relación) usa
Mermaid, que GitHub muestra sin pasos extra.

| Nivel C4 | Pregunta que responde | Diagrama | Sección |
|---|---|---|---|
| 1 · Contexto | ¿Quién usa el sistema y con qué sistemas externos habla? | `c4-1-contexto` | [§1](#1-contexto-del-sistema) |
| 2 · Contenedores | ¿Qué piezas desplegables lo forman y cómo se comunican? | `c4-2-contenedores` | [§2](#2-infraestructura-y-despliegue) |
| Despliegue | ¿Dónde corre cada contenedor? | `c4-despliegue` | [§2](#2-infraestructura-y-despliegue) |
| 3 · Componentes | ¿Qué módulos tiene cada contenedor y qué responsabilidad tiene cada uno? | `c4-3-componentes-api`, `c4-3-componentes-spa` | [§3](#3-backend), [§4](#4-frontend) |
| 4 · Código | ¿Cómo está implementado un componente crítico? | `c4-4-codigo-motor210`, `c4-4-codigo-captacion` | [§6](#6-motor-de-cálculo-motor210), [§7.7](#77-captación-de-prospectos--envío-y-baja) |

**Por qué C4-PlantUML y no Mermaid para la estructura.** El soporte C4 de
Mermaid sigue siendo experimental: no respeta la distribución de los
elementos y mezcla los límites. C4-PlantUML es la implementación de referencia
de la notación (persona, sistema, contenedor, componente, límites y leyenda
automática) y está en la librería estándar de PlantUML, así que se genera sin
conexión.

**Diagramas como código.** Las fuentes (`docs/diagramas/*.puml`) están
versionadas junto al código y comparten un estilo con la paleta de la marca
(`_estilo.puml`, `_estilo-codigo.puml`). Los SVG se regeneran con un comando,
sin instalar Java:

```bash
docs/diagramas/render.sh     # usa la imagen oficial de PlantUML en podman o docker
```

> **Regla del proyecto:** si un cambio agrega, quita o renombra un módulo, una
> ruta o una tabla, se actualiza su `.puml` y se regenera el SVG **en el mismo
> commit**. Un diagrama desactualizado es peor que no tener diagrama.

---

## Índice

1. [Contexto del sistema](#1-contexto-del-sistema)
2. [Infraestructura y despliegue](#2-infraestructura-y-despliegue)
3. [Backend](#3-backend)
4. [Frontend](#4-frontend)
5. [Modelo de datos](#5-modelo-de-datos)
6. [Motor de cálculo `motor210`](#6-motor-de-cálculo-motor210)
7. [Flujos críticos (secuencias)](#7-flujos-críticos-secuencias)
8. [Máquinas de estado](#8-máquinas-de-estado)
9. [Patrones de diseño aplicados](#9-patrones-de-diseño-aplicados)
10. [Seguridad transversal](#10-seguridad-transversal)
11. [Pruebas](#11-pruebas)
12. [Decisiones de arquitectura y sus porqués](#12-decisiones-de-arquitectura-y-sus-porqués)
13. [Buenas prácticas y estándares aplicados](#13-buenas-prácticas-y-estándares-aplicados)

---

## 1. Contexto del sistema

Una contadora gestiona declaraciones de renta de personas naturales en Colombia.
El sistema cubre cuatro necesidades: **captar** nuevos clientes, **avisar** a
los clientes, **recibir** sus documentos y **liquidar** el Formulario 210.

![C4 nivel 1: contexto del sistema](diagramas/c4-1-contexto.svg)

*Fuente: [`diagramas/c4-1-contexto.puml`](diagramas/c4-1-contexto.puml)*

Tres personas con niveles de confianza distintos, y cada una entra por una
puerta diferente:

| Persona | Cómo se identifica | Qué puede hacer |
|---|---|---|
| **Contadora** | Contraseña + Turnstile → token HMAC de 12 h | Todo el panel |
| **Cliente** | *Magic link* permanente, firmado con HMAC | Solo su propio portal |
| **Prospecto** | Enlace de baja firmado con HMAC (otro dominio de firma) | Solo darse de baja |

> **Alcance actual: un solo inquilino.** El sistema está construido para una
> contadora: no hay tabla de usuarios y ninguna tabla tiene columna de dueño.
> El plan para pasar a varios contadores con suscripción está diseñado en
> [PLAN-MULTITENANT.md](PLAN-MULTITENANT.md) — incluye los tres bloqueadores de
> esquema que hay que cerrar antes de abrir el registro.

### Los tres subsistemas

| Subsistema | Quién lo usa | Autenticación | Dónde corre la lógica |
|---|---|---|---|
| **Panel de administración** | La contadora | Contraseña → token HMAC de 12 h | Servidor + navegador |
| **Portal del cliente** | Cada cliente | *Magic link* permanente por correo | Servidor + navegador |
| **Liquidador 210** | La contadora | El mismo token del panel | **100 % navegador** |
| **Captación de prospectos** | La contadora envía; el prospecto solo recibe | Token del panel; la baja usa un enlace firmado | Servidor |

El Liquidador merece énfasis: el servidor **nunca calcula ni ve** ingresos,
patrimonio ni exógena. Solo guarda un blob cifrado que no puede interpretar
(§6 y §7.4).

---

## 2. Infraestructura y despliegue

Hosting compartido cPanel (LiteSpeed + Passenger), **con acceso SSH completo**.
Esa plataforma explica buena parte del diseño: procesos que se reciclan solos,
el app root que es también el document root, y un filtro de correo saliente
agresivo.

### Contenedores (C4 nivel 2)

![C4 nivel 2: contenedores](diagramas/c4-2-contenedores.svg)

*Fuente: [`diagramas/c4-2-contenedores.puml`](diagramas/c4-2-contenedores.puml)*

| Contenedor | Tecnología | Responsabilidad | Estado propio |
|---|---|---|---|
| Aplicación web | React 18 + Vite | Panel, portal, página de baja y **todo el cálculo del Liquidador** | `localStorage` (token y borradores del Liquidador) |
| Servidor web | LiteSpeed + `.htaccess` | Estáticos, cabeceras de seguridad replicadas, bloqueo `[F]` de rutas internas | Ninguno |
| API | Node 20 + Express 4 sobre Passenger | Autenticación sin estado, reglas de negocio, correo, alertas, captación | **Ninguno en memoria** (por diseño: Passenger recicla procesos) |
| Base de datos | MariaDB | Única fuente de verdad, incluido el candado anti-duplicados (`envios`) | Todo el estado del negocio |
| Almacén de archivos | Disco fuera del document root | Soportes de clientes y documentos finales | Archivos con nombre aleatorio |

### Despliegue

![Diagrama de despliegue](diagramas/c4-despliegue.svg)

*Fuente: [`diagramas/c4-despliegue.puml`](diagramas/c4-despliegue.puml)*

> **Nota histórica.** El proyecto se construyó cuando este hosting **no tenía
> shell** y todo se desplegaba por SFTP. Varias decisiones nacieron de esa
> restricción, que **ya está levantada**. Se conservan porque siguen siendo
> razonables, no porque sigan siendo obligatorias — están marcadas abajo y en
> [§12](#12-decisiones-de-arquitectura-y-sus-porqués) para que nadie herede una
> restricción que ya no existe.


### Consecuencias de esta infraestructura

| Restricción del hosting | Cómo se resolvió |
|---|---|
| Passenger corre **varios procesos** y los recicla | Autenticación **sin estado** (HMAC); nada de sesiones en memoria |
| El estado en memoria no se comparte | El *dedupe* de avisos vive en la tabla `envios`, no en RAM |
| ~~Sin shell para desplegar~~ *(ya no aplica)* | Nació de ahí la política de cero dependencias nuevas (`seguridad.js` no usa `helmet`). Hoy se despliega por SSH y `npm install` corre en el servidor |
| El app root **es** el document root | `.htaccess` con reglas `[F]` + uploads movidos fuera del árbol web |
| LiteSpeed sirve estáticos **sin pasar por Node** | Las cabeceras de seguridad se replican en `.htaccess` |
| El filtro saliente marca el SMTP local como spam | Correo por **API HTTPS de Brevo**, no por SMTP |
| Límite de conexiones MySQL por cuenta | `connectionLimit: 4` en el pool |

### Pipeline de despliegue

```mermaid
flowchart LR
    A["client/<br/>npm run build"] --> B["server/public/<br/>bundle con hash"]
    B --> C["scp a repolite"]
    D["server/src/*.js<br/>modificados"] --> C
    C --> C2["borrar bundles<br/>viejos de assets/"]
    C2 --> N{"¿cambiaron<br/>dependencias?"}
    N -->|sí| NPM["ssh: activar nodevenv<br/>+ npm install --omit=dev"]
    N -->|no| E
    NPM --> E["ssh: touch tmp/restart.txt"]
    E --> F["Passenger recicla<br/>20–30 s"]
    F --> G["curl a un<br/>endpoint del API"]

    style G fill:#2d5016,color:#fff
    style NPM fill:#123a63,color:#fff
```

> Verificar contra un endpoint del **API**, nunca contra un estático:
> LiteSpeed sirve los archivos sin tocar Node y daría un falso positivo.

**`node` y `npm` no están en el `PATH`**: los pone el virtualenv de CloudLinux,
que hay que activar en cada sesión SSH
(`source ~/nodevenv/declaraciones-renta-pn.repolite.link/20/bin/activate`).
El servidor tiene `git`, `mysql`, `mysqldump`, `crontab`, `curl` y `zip`;
**no tiene `rsync`**. Comandos concretos en
[MANUAL-TECNICO §9](MANUAL-TECNICO.md#9-desarrollo-local-y-despliegue).

---

## 3. Backend

Express 4 sobre Node 20. Arquitectura **en capas**, con una regla dura: *todo
el SQL vive en `datos.js`*.

![C4 nivel 3: componentes de la API](diagramas/c4-3-componentes-api.svg)

*Fuente: [`diagramas/c4-3-componentes-api.puml`](diagramas/c4-3-componentes-api.puml).
En rojo, los componentes de seguridad; en azul oscuro, el único con acceso a SQL.*

### Responsabilidad de cada módulo

| Módulo | Responsabilidad única | No hace |
|---|---|---|
| `server.js` | Cargar `.env`, `db.init()`, `listen`, timer de alertas | Nada de rutas |
| `app.js` | Definir rutas, validar entrada, componer servicios | Nada de SQL |
| `datos.js` | Todo el SQL + mapeo fila → objeto de dominio | No conoce HTTP ni `req`/`res` |
| `db.js` | Pool, DDL idempotente, migraciones | No sabe de negocio |
| `auth.js` | Emitir/validar tokens (sesión, portal, baja), bloquear fuerza bruta | No toca la base de datos |
| `correo.js` | Elegir canal, renderizar plantillas, enviar en lote; en captación aplica el tope diario | No decide *cuándo* enviar |
| `horarioContacto.js` | Regla pura: ¿se puede contactar con publicidad ahora? (Ley 2300 + festivos) | No envía ni consulta la base |
| `plantillaCaptacion.js` | Plantilla inicial del correo de captación | No se usa en caliente: siembra `config` una vez |
| `avisos.js` | Decidir *cuándo* avisar a la contadora + *dedupe* | No renderiza correos de clientes |
| `archivos.js` | Guardar, validar y borrar archivos en disco | No sabe qué representa el archivo |
| `cifrado.js` | Cifrar/descifrar un string | No sabe qué está cifrando |
| `seguridad.js` | Cabeceras HTTP + limitador por IP | No autentica |

### Cadena de middleware (Chain of Responsibility)

Cada petición atraviesa una cadena que se corta en el primer eslabón que
rechaza. Los dos routers están registrados en un orden que importa:

```mermaid
flowchart TD
    REQ["Petición HTTP"] --> TP["trust proxy<br/>resuelve req.ip real"]
    TP --> CAB["cabeceras()<br/>CSP · HSTS · no-store"]
    CAB --> JSON["express.json<br/>límite 2 MB"]
    JSON --> Q{"¿ruta?"}

    Q -->|"/api/portal/*"| LP["limitePortal<br/>120 / 5 min"]
    Q -->|"/api/*"| LA["limiteApi<br/>600 / 5 min"]
    Q -->|"resto"| STA["estáticos + SPA fallback"]

    LP --> RP{"subruta"}
    RP -->|"/recuperar"| LS1["limiteSensible<br/>10 / 15 min"]
    RP -->|"/:token/documentos"| LSU["limiteSubidas<br/>60 / 10 min"]
    RP -->|"otras"| CCP

    LS1 --> TURN["verificarTurnstile"]
    LSU --> CCP["cargarClientePortal<br/>valida HMAC del enlace"]
    CCP --> MUL["subirArchivo<br/>multer + magic bytes"]
    MUL --> H1["handler"]

    LA --> EX{"¿excepción?"}
    EX -->|"/cron/alertas"| CRO["compara CRON_SECRET<br/>en tiempo constante"]
    EX -->|"/login"| LS2["limiteSensible → login()"]
    EX -->|"resto"| AUTH["requiereAuth<br/>Bearer HMAC"]
    AUTH --> H2["handler"]

    H1 --> WRAP["ruta&#40;fn&#41;<br/>captura errores async → JSON 500"]
    H2 --> WRAP
    WRAP --> RES["Respuesta"]

    style CAB fill:#7a1f1f,color:#fff
    style AUTH fill:#7a1f1f,color:#fff
    style CCP fill:#7a1f1f,color:#fff
```

> **Orden crítico**: `/api/portal` se registra **antes** que `/api`. Lo que no
> coincida con una ruta del portal cae al router `/api` y termina en el 401 de
> `requiereAuth` — nunca queda una ruta del portal accidentalmente pública en
> el router equivocado.

---

## 4. Frontend

React 18 + Vite. **Sin router externo**: `main.jsx` decide la vista con una
expresión regular sobre `window.location.pathname`. Sin framework de CSS: un
solo `styles.css` con la paleta de marca en `:root`. Sin gestor de estado
global: `useState` local y props.

![C4 nivel 3: componentes de la aplicación web](diagramas/c4-3-componentes-spa.svg)

*Fuente: [`diagramas/c4-3-componentes-spa.puml`](diagramas/c4-3-componentes-spa.puml)*

El Liquidador es un asistente de 9 pasos (`PasoExogena` → `PasoCedulas` →
`PasoGananciaOcasional` → `PasoPatrimonio` → `PasoAnticipo` → `PasoImpuesto`
→ `PasoFormulario210` → `PasoResultado`, con los anexos en PDF) que llama a
`motor210/liquidar()` en cada render. Su nivel de código está en
[§6](#6-motor-de-cálculo-motor210).

### La capa `api.js`

Tres funciones, un solo lugar donde se decide qué pasa con el token:

| Función | Para qué | Detalle |
|---|---|---|
| `api(ruta, opciones)` | JSON | Serializa el body, pone `Authorization: Bearer` |
| `apiFormulario(ruta, formData)` | Subir archivos | **No** fija `Content-Type`: el navegador debe poner el *boundary* |
| `apiArchivo(ruta)` | Descargar binarios | Devuelve un `Blob`; los archivos nunca son estáticos públicos |

Las tres comparten el mismo manejo de sesión expirada:

```mermaid
sequenceDiagram
    participant V as Vista
    participant A as api.js
    participant S as Servidor
    participant APP as App.jsx

    V->>A: api('/clientes')
    A->>S: GET /api/clientes<br/>Authorization: Bearer …
    S-->>A: 401 No autorizado
    A->>A: setToken(null)
    A->>APP: dispatchEvent('sesion-expirada')
    APP->>APP: setAutenticado(false) → Login
    A-->>V: throw 'Sesión expirada'
```

Un **evento del `window`** en lugar de un contexto de React: cualquier módulo
puede provocar el logout sin que las vistas tengan que propagarlo hacia arriba.

### Convenciones del frontend

- **Configuración declarativa en tablas**: `PESTANAS` en `App.jsx`, `PASOS` en
  `Wizard.jsx` y `Guia.jsx`, `FILAS_RESUMEN` en `PasoResultado.jsx`,
  `ENTREGA_TITULOS` en `Portal.jsx`. Agregar una pestaña o un paso es agregar
  una fila, no tocar el `render`.
- **Móvil primero**: el drawer del panel y todo el Portal del cliente están
  diseñados para 390 px. Los clientes suben fotos de sus soportes desde el
  celular.
- **Español en todo**: nombres de variables, funciones y comentarios. Los
  comentarios explican el *por qué*, no el *qué*.

---

## 5. Modelo de datos

MariaDB, **sin ORM y sin archivos de migración**. `db.init()` corre en cada
arranque: `CREATE TABLE IF NOT EXISTS` para el esquema y migraciones puntuales
que consultan `information_schema` antes de aplicar un `ALTER`. Todo
idempotente.

### Diagrama entidad-relación

```mermaid
erDiagram
    CLIENTES ||--o{ DOCUMENTOS : "sube al portal"
    CLIENTES ||--o{ ENTREGAS : "recibe del panel"
    CLIENTES ||--o{ ENVIOS : "registra correos"
    PLANTILLAS ||--o{ CLIENTES : "define checklist de"
    CLIENTES |o..o| LIQUIDACIONES210 : "por cedula_norm"
    PROSPECTOS |o..o| CLIENTES : "se convierte en"
    PROSPECTOS ||--o{ ENVIOS : "registra captación"

    CLIENTES {
        varchar id PK "id aleatorio"
        varchar nombre
        varchar email
        varchar cedula "como la digitó la contadora"
        varchar cedula_norm UK "solo dígitos — clave natural"
        varchar telefono
        varchar plantilla_id FK "lógica, sin constraint"
        text notas
        tinyint declarado "1 = ya presentó"
        text dian_clave "AES-256-GCM en base64"
        datetime dian_actualizado
        datetime ultimo_envio
        datetime creado
    }

    PLANTILLAS {
        varchar id PK
        varchar nombre "perfil: empleado, independiente…"
        text documentos "JSON array de strings"
    }

    DOCUMENTOS {
        varchar id PK
        varchar cliente_id FK
        text nombre "frase larga del checklist"
        char nombre_hash UK "sha1(nombre) — cabe en el índice"
        varchar archivo "nombre aleatorio en disco"
        varchar original "nombre que subió el cliente"
        varchar mime
        int tamano
        varchar estado "subido | aprobado | rechazado"
        text motivo "visible para el cliente"
        datetime subido_en
        datetime revisado_en
    }

    ENTREGAS {
        varchar cliente_id PK "PK compuesta"
        varchar tipo PK "declaracion | anexo | recibo"
        varchar archivo
        varchar original
        datetime fecha
    }

    ENVIOS {
        varchar id PK
        varchar cliente_id FK
        varchar nombre "copia histórica"
        varchar email "copia histórica"
        datetime fecha
        varchar estado "ok | error"
        text error
        varchar tipo "recordatorio | portal | novedades | revision | aviso-subida | alerta-vencimiento | recuperacion"
    }

    CALENDARIO {
        int posicion PK
        varchar digitos "JSON, p.ej. [1,2]"
        date fecha "vencimiento DIAN"
    }

    CONFIG {
        varchar clave PK
        text valor "plantillas de correo, remitente, correo_avisos"
    }

    LIQUIDACIONES210 {
        varchar cedula_norm PK "no clientes.id, a propósito"
        longtext datos_cifrados "AES-256-GCM del estado del Wizard"
        datetime actualizado_en
    }

    PROSPECTOS {
        varchar id PK
        varchar email UK "clave natural"
        varchar nombre "puede ir vacío"
        varchar estado "nuevo · contactado · respondio · convertido · descartado · baja"
        varchar cliente_id "lógica, al convertirse"
        datetime baja_en
    }
```

### Notas de modelado que no se ven en el diagrama

| Decisión | Porqué |
|---|---|
| **Sin `FOREIGN KEY`** en el DDL | Las relaciones se validan en `datos.js`. Evita fallos de arranque si una tabla se creó antes que otra y sobrevive a restauraciones parciales del hosting |
| `documentos.nombre_hash` = `sha1(nombre)` | Los nombres del checklist son frases largas; un `UNIQUE` sobre `TEXT` en `utf8mb4` no cabe en el índice de MySQL |
| `entregas` con **PK compuesta** `(cliente_id, tipo)` | Un archivo por tipo por cliente, garantizado por el motor. Reemplazar hace `UPSERT` y borra el anterior del disco |
| `liquidaciones210` se indexa por `cedula_norm`, **no** por `clientes.id` | La contadora liquida también para personas que aún no son clientes formales del portal |
| `envios` es historial **y** candado | `hayEnvioDesde(tipo, desde, clienteId)` implementa el *dedupe* de avisos. La base de datos es el único estado compartido entre los procesos de Passenger |
| Fechas en **hora de Bogotá**, no UTC | `ahoraBogota()` con formato `sv-SE`. El historial se muestra tal cual, sin conversiones que confundan a la usuaria |
| `cedula_norm` `UNIQUE` | Clave natural del negocio: evita duplicados al importar el mismo Excel dos veces |
| `prospectos` es tabla **aparte** de `clientes` | Un prospecto no tiene portal, plantilla, clave DIAN ni alertas, y el nombre puede faltar. Mezclarlos habría obligado a filtrar en cada consulta de clientes. Al convertirse se crea el cliente y queda `cliente_id` |
| `prospectos` guarda **solo nombre y correo** | Minimización de datos (Ley 1581): es lo único necesario para escribirles. La cédula se pide al convertir en cliente. Como no hay NIT, el correo muestra la tabla de plazos pendientes (`tablaFechas()`, derivada del calendario) en vez de una fecha personal |
| `envios.cliente_id` guarda también ids de prospecto | Los ids son aleatorios y no chocan; `tipo = 'captacion'` distingue. El tope diario de captación se cuenta sobre esta misma tabla |

### El checklist es derivado, no almacenado

No existe una tabla `checklist`. Se arma en memoria cruzando la plantilla del
cliente contra sus documentos subidos:

```mermaid
flowchart LR
    A["plantillas.documentos<br/>JSON array"] --> C{"armarChecklist()"}
    B["documentos<br/>filas del cliente"] --> C
    C --> D["pendiente<br/>en la plantilla, sin subir"]
    C --> E["subido / aprobado / rechazado<br/>cruce por nombre_hash"]
    C --> F["adicional<br/>subido, fuera de la plantilla"]
```

Consecuencia útil: editar una plantilla cambia al instante el checklist de todos
sus clientes, sin migrar datos.

---

## 6. Motor de cálculo `motor210`

El corazón técnico del proyecto: **~30 módulos de funciones puras** que
convierten los datos digitados en las casillas del Formulario 210 de la DIAN.

Tres propiedades que definen su diseño:

1. **Puro**: sin `fetch`, sin `localStorage`, sin `Date.now()`. Entra un objeto,
   sale un objeto. Por eso hay 156 pruebas que corren en 1,3 s.
2. **Aislado del servidor**: corre íntegro en el navegador.
3. **Trazable al ET**: cada módulo cita el artículo del Estatuto Tributario que
   implementa; la fundamentación completa está en
   [reglas-tributarias-AG2025.md](reglas-tributarias-AG2025.md).

### Estructura del código (C4 nivel 4)

![C4 nivel 4: código de motor210](diagramas/c4-4-codigo-motor210.svg)

*Fuente: [`diagramas/c4-4-codigo-motor210.puml`](diagramas/c4-4-codigo-motor210.puml)*

Las seis cédulas cumplen el mismo **contrato** (`calcular…(input, ctx)` →
`SalidaCedula`), así que el orquestador las trata de forma uniforme y cada una
se prueba por separado.

> **Hallazgo documentado.** `cascada.js > limitarConTopeCompartido()` describe y
> prueba la regla de los topes compartidos, pero hoy **ningún módulo lo
> importa**: `liquidar()` aplica la misma cascada en línea, pasando a cada
> cédula el saldo disponible (`medicinaDisponible`, `viviendaDisponible`,
> `icetexDisponible`) por `ctx`. Los resultados coinciden (los tests de ambos
> pasan), pero hay dos implementaciones de la misma regla. Pendiente:
> hacer que `liquidar()` use `cascada.js` o eliminarlo.

### El orden de `liquidar()` no es arbitrario

Hay tres dependencias circulares aparentes que se resuelven con **pasadas
sucesivas**. Este es el punto más delicado del motor:

```mermaid
flowchart TD
    START(["liquidar(entrada)"]) --> S1["<b>1.</b> Cédula trabajo<br/>primera pasada, tope completo"]
    S1 --> S2["<b>2.</b> Honorarios provisional con tope=0<br/><i>solo para obtener ingresosBrutos</i>"]
    S2 --> S2B["<b>2b.</b> Dependientes Art. 387<br/>prorrateo trabajo ↔ honorarios"]
    S2B --> S3["<b>2c.</b> Trabajo <b>segunda pasada</b><br/>ahora la renta exenta 25% resta dependientes"]

    S3 --> C1["<b>3.</b> Cascada de topes compartidos"]
    C1 --> C2["trabajo → honorarios → capital → no laboral"]
    C2 --> C3["medicina: solo trabajo y honorarios<br/>vivienda e ICETEX: las cuatro"]

    C3 --> S4["<b>4.</b> Sumar dependientes a la bolsa limitada"]
    S4 --> S5["<b>5.</b> Patrimonio + reajuste fiscal"]
    S5 --> S5B["<b>5b.</b> Pensiones · dividendos · ganancia ocasional<br/><i>tarifa propia, fuera de la cascada</i>"]

    S5B --> S6["<b>6.</b> Formulario 210 — <b>primera pasada</b><br/>casilla 96 = 0"]
    S6 --> S7["<b>7.</b> Comparación patrimonial<br/>usa el resultado de la pasada 1"]
    S7 --> Q{"¿la contadora<br/>confirmó incluirla?"}
    Q -->|no| OUT1["Advertencia visible<br/>casilla 96 sigue en 0"]
    Q -->|sí| S8["<b>8.</b> Formulario 210 — <b>segunda pasada</b><br/>casilla 96 poblada"]
    OUT1 --> FIN(["casillas · intermedios · advertencias"])
    S8 --> FIN

    style S3 fill:#123a63,color:#fff
    style S7 fill:#7a5c00,color:#fff
    style Q fill:#7a5c00,color:#fff
```

Tres reglas que hay que respetar al tocar este archivo:

1. **No redondear antes de `formulario210.js`.** El redondeo a la unidad de mil
   (Art. 577 ET) pasa solo al ensamblar las casillas. Redondear en cada módulo
   acumula diferencias contra el `.xlsm` de referencia de la contadora.
2. **La comparación patrimonial nunca se aplica sola.** Es un diagnóstico que se
   muestra como advertencia; la casilla 96 solo se puebla si la contadora lo
   confirma tras hablar con el cliente. Un ajuste automático aquí tendría
   consecuencias reales frente a la DIAN.
3. **La cascada de topes es un orden, no un conjunto.** Trabajo consume primero;
   lo que sobra baja. Cambiar el orden cambia el resultado.

### `clasificarExogena.js` — deliberadamente conservador

Lee la columna *"Uso declaración Sugerida"* del propio reporte del MUISCA en vez
de mantener a mano una tabla de códigos DIAN que envejece cada año. Lo que no
reconoce con confianza queda en **"sin clasificar"** para digitar a mano:
**nunca adivina**.

> Los exports reales del MUISCA a veces traen el rango `!ref` de la hoja
> dañado. `PasoExogena.jsx` lo recalcula desde las celdas reales antes de
> convertir a filas; sin eso, SheetJS trunca los datos **en silencio**.

---

## 7. Flujos críticos (secuencias)

### 7.1 Login del panel — token sin estado

```mermaid
sequenceDiagram
    autonumber
    actor C as Contadora
    participant L as Login.jsx
    participant T as Turnstile
    participant API as app.js
    participant A as auth.js

    C->>L: contraseña
    L->>T: resuelve el widget
    T-->>L: token del captcha
    L->>API: POST /api/login
    API->>API: limiteSensible — 10 / 15 min por IP
    API->>T: siteverify (server-side)
    Note over API,T: si Cloudflare no responde,<br/>se deja pasar: no bloquear<br/>por una caída externa
    API->>A: login(password, req.ip)
    A->>A: igualSeguro() — timingSafeEqual sobre bytes
    alt contraseña incorrecta
        A->>A: fallos++ · 5 fallos = bloqueo 60 s por IP
        A-->>API: { error }
        API-->>L: 401
    else correcta
        A->>A: exp = ahora + 12 h<br/>firma = HMAC-SHA256(exp, clave)
        A-->>API: token "exp.firma"
        API-->>L: { token }
        L->>L: localStorage.setItem('token')
    end
```

**La clave HMAC se deriva de `ADMIN_PASSWORD`.** Cualquier proceso de Passenger
valida el token sin consultar nada compartido — y cambiar la contraseña invalida
todas las sesiones de golpe.

### 7.2 El cliente sube un documento

```mermaid
sequenceDiagram
    autonumber
    actor CL as Cliente
    participant P as Portal.jsx
    participant API as app.js
    participant AU as auth.js
    participant AR as archivos.js
    participant D as datos.js
    participant AV as avisos.js
    participant B as Brevo
    actor CO as Contadora

    CL->>P: elige archivo del celular
    P->>API: POST /api/portal/:token/documentos
    API->>API: limiteSubidas — 60 / 10 min
    API->>AU: clienteIdDelPortal(token)
    AU->>AU: HMAC("portal:" + id) comparado en tiempo constante
    AU-->>API: clienteId | null
    alt token inválido
        API-->>P: 401 → página "enlace no válido"
    else válido
        API->>AR: subirArchivo — multer
        AR->>AR: extensión permitida · ≤ 15 MB
        AR->>AR: <b>firmaValida()</b> — primeros bytes vs. extensión
        Note over AR: un .exe renombrado a .pdf<br/>se rechaza aquí
        AR->>AR: guarda con nombre aleatorio<br/>fuera del document root
        AR-->>API: req.file
        API->>D: guardarDocumento()
        D->>D: UPSERT por (cliente_id, nombre_hash)
        alt reemplazo
            D-->>API: archivo anterior
            API->>AR: borrarArchivo(anterior)
            Note over API: el documento vuelve a "en revisión"
        end
        API->>AV: avisarSubida(cliente)
        AV->>D: hayEnvioDesde('aviso-subida', hace 30 min, clienteId)
        alt ya avisó hace poco
            AV-->>API: no envía
            Note over AV: freno para no mandar<br/>un correo por archivo
        else
            AV->>B: correo a config.correo_avisos
            B->>CO: correo "Un cliente subió documentos"
            AV->>D: registra en envios
        end
        API-->>P: 201 + checklist actualizado
    end
```

### 7.3 Alerta diaria de vencimientos — dos disparadores, un solo correo

El problema: Passenger corre N procesos, cada uno con su `setInterval`, **y**
hay un cron externo. El candado no puede vivir en memoria.

```mermaid
sequenceDiagram
    autonumber
    participant CR as Cron cPanel 7:00 am
    participant P1 as Proceso 1
    participant P2 as Proceso 2
    participant AV as avisos.js
    participant D as tabla envios
    participant B as Brevo
    actor CO as Contadora

    par Disparador externo
        CR->>P1: GET /api/cron/alertas?clave=…
        Note over P1: además <b>despierta</b> la app<br/>si Passenger la durmió
        P1->>P1: igualSeguro(clave, CRON_SECRET)
        P1->>AV: revisarVencimientos()
    and Timer interno cada 30 min
        P2->>P2: ¿entre 7am y 9pm Bogotá?
        P2->>AV: revisarVencimientos()
    end

    AV->>D: hayEnvioDesde('alerta-vencimiento', hoy 00:00)
    alt ya se envió hoy
        D-->>AV: sí
        AV-->>P2: no hace nada
        Note over AV,D: <b>La base de datos es el candado.</b><br/>Da igual cuántos procesos<br/>o disparadores corran.
    else primera vez hoy
        D-->>AV: no
        AV->>D: clientesEnHitos() — 15 / 8 / 3 / 0 días
        Note over AV: excluye los marcados "ya declaró"
        AV->>B: correo con colores por urgencia
        B->>CO: alerta del día
        AV->>D: INSERT en envios → cierra el candado
    end
```

### 7.4 Liquidador 210 — persistencia local-first con sincronía cifrada

El estado del Wizard es grande y sensible. Se guarda en dos sitios con
prioridades distintas: `localStorage` es la **caché rápida y el respaldo
offline**; el servidor es la **fuente compartida entre computadores**.

```mermaid
sequenceDiagram
    autonumber
    actor C as Contadora
    participant W as Wizard.jsx
    participant LS as localStorage
    participant API as app.js
    participant CI as cifrado.js
    participant DB as liquidaciones210

    rect rgb(240,245,250)
    Note over C,DB: Carga — cadena de respaldo, se detiene en el primer éxito
    C->>W: digita una cédula
    W->>API: GET /api/liquidaciones210/:cedula
    API->>DB: SELECT por cedula_norm
    alt hay estado en el servidor
        DB-->>API: blob cifrado
        API->>CI: descifrar()
        CI-->>API: JSON
        API-->>W: estado → origen "servidor"
    else 404 o sin conexión
        W->>LS: getItem("f210:" + cedula)
        alt hay copia local
            LS-->>W: estado → origen "guardado"
            W-)API: PUT — <b>migra</b> este caso al servidor
        else
            W->>API: GET /api/clientes
            Note over W: autocompleta nombre → origen "db"<br/>o arranca en blanco → "nuevo"
        end
    end
    end

    rect rgb(245,240,250)
    Note over C,DB: Autoguardado en cada cambio
    C->>W: edita cualquier campo
    W->>LS: setItem inmediato
    W->>W: debounce 1500 ms
    W->>API: PUT /api/liquidaciones210/:cedula
    API->>CI: cifrar(JSON.stringify(estado))
    CI-->>API: base64(iv | authTag | datos)
    API->>DB: UPSERT
    API-->>W: ok → indicador "guardado"
    Note over W: si falla, el indicador dice "error"<br/>pero <b>nunca bloquea</b>:<br/>el caso sigue en localStorage
    end

    Note over API,DB: El servidor guarda un blob que<br/>no puede interpretar. Los ingresos y<br/>el patrimonio nunca existen en claro<br/>fuera del navegador de la contadora.
```

### 7.5 Revisión y notificación de resultado

```mermaid
sequenceDiagram
    autonumber
    actor CO as Contadora
    participant R as Revision.jsx
    participant API as app.js
    participant D as datos.js
    participant CR as correo.js
    participant B as Brevo
    actor CL as Cliente

    CO->>R: abre la ficha del cliente
    R->>API: GET /api/clientes/:id/documentos
    API->>D: armarChecklist(plantilla, documentos)
    D-->>R: pendientes · en revisión · aprobados · rechazados · adicionales

    loop por cada documento
        CO->>R: ver / descargar
        R->>API: GET /api/documentos/:id/archivo
        Note over API: lee del disco con fs y responde<br/>por el API — el archivo nunca<br/>es un estático público
        CO->>R: aprobar o rechazar con motivo
        R->>API: PUT /api/documentos/:id/revision
        API->>D: revisarDocumento()
    end

    CO->>R: "Enviar resultado por correo"
    R->>API: POST /api/clientes/:id/notificar-revision
    API->>CR: enviarRevision(clienteId)
    CR->>CR: renderCorreoRevision — HTML en código,<br/>paleta de marca inline
    CR->>B: envía
    B->>CL: aprobados · por corregir · sin subir
    CR->>D: registra en envios tipo "revision"
```

### 7.6 Recuperar el enlace — respuesta anti-enumeración

```mermaid
flowchart TD
    A["Cliente en /portal sin token"] --> B["digita su cédula"]
    B --> C["limiteSensible<br/>10 / 15 min por IP"]
    C --> D["verificarTurnstile"]
    D --> E{"¿existe la cédula?"}
    E -->|no| Z["respuesta genérica"]
    E -->|sí| F{"¿envió hace<br/>menos de 15 min?"}
    F -->|sí| Z
    F -->|no| G["envía el enlace al<br/><b>correo registrado</b>"]
    G --> H["registra en envios<br/>tipo 'recuperacion'"]
    H --> Z
    Z["<b>Siempre</b>: 'Si la cédula está registrada,<br/>te enviamos tu enlace al correo que<br/>tenemos en el sistema.'"]

    style Z fill:#123a63,color:#fff
```

Dos propiedades a la vez: nunca confirma si una cédula existe, y **nunca envía a
un correo que el visitante escriba** — solo al que ya está en la base de datos.

### 7.7 Captación de prospectos — envío y baja

La contadora escribe a posibles clientes. Es el único flujo del sistema
dirigido a personas que **no** tienen relación contractual con ella, así que
lleva tres controles que los demás correos no necesitan: horario legal, tope
diario y baja.

![C4 nivel 4: código de la captación](diagramas/c4-4-codigo-captacion.svg)

*Fuente: [`diagramas/c4-4-codigo-captacion.puml`](diagramas/c4-4-codigo-captacion.puml)*

```mermaid
sequenceDiagram
    autonumber
    actor C as Contadora
    participant V as Prospectos.jsx
    participant A as app.js
    participant H as horarioContacto.js
    participant M as correo.js
    participant D as datos.js
    participant B as Brevo
    actor P as Prospecto

    C->>V: marca hasta el cupo del día (páginas de 20)
    V->>A: POST /api/prospectos/enviar {ids}
    A->>M: enviarLoteCaptacion(ids)
    M->>H: puedeContactar(ahoraBogota())
    alt fuera del horario de la Ley 2300
        H-->>M: {ok:false, motivo}
        M-->>A: {error}
        A-->>V: 400 + motivo (no sale nada)
    else horario permitido
        M->>D: contarEnviosDesde('captacion', hoy)
        loop por cada prospecto, con pausa de 1,5 s
            M->>M: renderCorreoCaptacion() — advertencias bloquean
            M->>B: HTML + texto + List-Unsubscribe (RFC 8058)
            M->>D: marcarProspectoContactado() + registrarEnvio()
        end
        A-->>V: resultados por prospecto
    end

    B-->>P: correo
    alt baja desde el cliente de correo (un clic)
        P->>A: POST /api/portal/baja/{token} (Gmail/Outlook)
    else baja desde el enlace del correo
        P->>V: abre /baja/{token} → botón "Confirmar baja"
        V->>A: POST /api/portal/baja/{token}
    end
    A->>A: prospectoIdDeBaja(token) — HMAC, prefijo "baja:"
    A->>D: darDeBajaProspecto() — nunca más se le escribe
```

| Control | Dónde | Por qué |
|---|---|---|
| Horario de la Ley 2300 de 2023 | `horarioContacto.js`, validado en el servidor | La restricción es legal; no puede depender de que la interfaz esconda el botón |
| Festivos calculados, no tabulados | `festivosColombia()` (Pascua de Meeus + Ley Emiliani) | Una lista fija caduca cada año sin que nadie lo note |
| Tope diario (20) | `LIMITE_DIARIO_CAPTACION` + selección limitada en la vista | Una base fría enviada de golpe daña la reputación del remitente, que es el mismo de los correos a clientes |
| Baja obligatoria | `{{baja}}` en la plantilla + cabeceras `List-Unsubscribe` | Ley 1581 de 2012 y requisito de Gmail/Yahoo para remitentes masivos |
| Baja con confirmación | `Baja.jsx` pide un botón; no actúa al abrir la página | Los filtros de seguridad del correo abren los enlaces solos |
| Token de baja con dominio propio | `auth.js > firmaBaja()` firma `baja:{id}` | Un token de baja nunca sirve como token de portal, ni al revés |
| Minimización de datos | `prospectos` guarda solo nombre y correo | La cédula se pide cuando la persona ya aceptó ser cliente |

---

## 8. Máquinas de estado

### Documento del checklist

```mermaid
stateDiagram-v2
    [*] --> pendiente : está en la plantilla del cliente

    pendiente --> subido : el cliente sube el archivo
    subido --> aprobado : la contadora aprueba
    subido --> rechazado : la contadora rechaza con motivo
    rechazado --> subido : el cliente reemplaza<br/>(borra el anterior del disco)
    subido --> subido : reemplazo antes de revisar

    aprobado --> [*] : no se puede reemplazar<br/>desde el portal

    state adicional {
        [*] --> extra : "Agregar otro documento"<br/>nombre libre 3–120 chars
        note right of extra
            Fuera de la plantilla.
            Máx. 60 documentos por cliente.
            Sigue el mismo ciclo de revisión.
        end note
    }
```

### Ciclo del cliente en la temporada

```mermaid
stateDiagram-v2
    [*] --> registrado : importado de Excel/CSV<br/>o creado a mano

    registrado --> avisado : correo recordatorio<br/>vencimiento calculado por cédula
    avisado --> invitado : correo con el enlace personal
    invitado --> recolectando : el cliente sube documentos

    recolectando --> recolectando : avisos internos a la contadora<br/>freno de 30 min
    recolectando --> revisado : todo aprobado
    revisado --> presentado : se sube la declaración<br/>→ declarado = 1

    presentado --> [*]

    note left of presentado
        declarado = 1 lo saca de:
        · las alertas de vencimiento
        · los envíos masivos
        En la lista muestra "Declaró ✓"
        y su portal muestra la tarjeta
        verde de descarga.
    end note

    state "alerta de vencimiento" as alerta
    avisado --> alerta : faltan 15 días
    alerta --> alerta : 8 · 3 · hoy<br/>colores por urgencia
    invitado --> alerta
    recolectando --> alerta
```

### Prospecto (captación)

```mermaid
stateDiagram-v2
    [*] --> nuevo : importado de CSV/Excel<br/>(se omiten los que ya son clientes)
    nuevo --> contactado : correo de captación<br/>horario Ley 2300 · tope diario
    contactado --> respondio : marcado a mano
    nuevo --> convertido : "Pasar a Clientes"
    contactado --> convertido
    respondio --> convertido
    nuevo --> descartado
    contactado --> descartado
    respondio --> descartado
    nuevo --> baja : enlace del correo<br/>o List-Unsubscribe
    contactado --> baja
    respondio --> baja
    convertido --> [*]
    baja --> [*]

    note right of baja
        Terminal para la captación:
        renderCorreoCaptacion() lo
        marca con advertencia y
        enviarLoteCaptacion() lo omite.
    end note
```

---

## 9. Patrones de diseño aplicados

Patrones que están **realmente en el código**, con el archivo donde vive cada
uno y el problema concreto que resuelve.

### Backend

| Patrón | Dónde | Problema que resuelve |
|---|---|---|
| **Arquitectura en capas** | `app.js` → `datos.js` → `db.js` | Cambiar de MySQL a otra base toca un solo archivo |
| **Repository** | `datos.js` | Único lugar con SQL. Los handlers reciben objetos de dominio, no filas |
| **Data Mapper** | `mapCliente`, `mapDocumento`, `mapEntrega`, `mapPlantilla` | Traduce `snake_case` de SQL a `camelCase` de JS y parsea los JSON embebidos |
| **Chain of Responsibility** | Middleware de Express | Cabeceras → rate limit → auth → handler; se corta en el primer rechazo |
| **Decorator** | `ruta(fn)` en `app.js` | Envuelve handlers `async` para que ningún *rejection* tumbe el proceso |
| **Strategy con prioridad** | `correo.js > enviarCorreo()` | Brevo → SMTP → Gmail. En producción solo funciona Brevo; en local, Gmail |
| **Self-contained token** | `auth.js` | Sesiones imposibles: Passenger recicla procesos. El token se valida sin estado compartido |
| **Magic link** | `auth.js > tokenPortal()` | Los clientes no tienen ni recuerdan contraseñas |
| **Idempotent schema migration** | `db.js > init()` | El arranque converge el esquema, sin herramienta ni paso manual de migración |
| **Additive seeding** | `INSERT IGNORE` en `db.js` | Las claves nuevas de `seed.js` llegan a producción sin pisar lo que la usuaria ya editó |
| **Database-backed lock** | `datos.hayEnvioDesde()` | *Dedupe* de avisos entre N procesos sin Redis ni memoria compartida |
| **Fixed-window rate limiter** | `seguridad.js > limitador()` | Fuerza bruta y raspado, sin agregar dependencias |
| **Encryption at rest** | `cifrado.js` | Si la base se filtra, la clave DIAN y las liquidaciones son ilegibles sin `DATA_SECRET` |
| **Content-based validation** | `archivos.js > firmaValida()` | La extensión la falsea cualquiera; los *magic bytes* no |
| **Anti-enumeration response** | `POST /api/portal/recuperar` | Impide usar el formulario como oráculo de cédulas registradas |
| **Fail-open deliberado** | `turnstile.js` | Si Cloudflare cae, no dejar a la usuaria fuera de su propio sistema |
| **Separación de dominio en firmas** | `auth.js`: prefijos `portal:` y `baja:` en el HMAC | Un token emitido para un propósito no es válido para otro |
| **Regla de negocio como función pura** | `horarioContacto.js > puedeContactar()` | La regla legal se prueba sin reloj, red ni base de datos |
| **Throttling de negocio** | `enviarLoteCaptacion()` + `contarEnviosDesde()` | El tope diario sobrevive a reinicios y a varios procesos porque se cuenta en `envios` |
| **Guard clauses con advertencias** | `renderCorreoCaptacion().advertencias` | El mismo cálculo alimenta la vista previa ("no se le enviaría: …") y el envío |

### Frontend

| Patrón | Dónde | Problema que resuelve |
|---|---|---|
| **Functional core / imperative shell** | `motor210/` vs. `vistas/` | La lógica tributaria es pura y testeable; React solo dibuja |
| **Pipeline orchestrator** | `motor210/index.js > liquidar()` | Un único punto que resuelve el orden entre módulos acoplados |
| **Two-pass calculation** | `liquidar()` pasos 2c y 8 | Rompe dependencias circulares reales del formulario |
| **Cascading budget allocation** | `liquidar()` (regla documentada y probada en `cascada.js`) | Topes compartidos que se consumen en un orden normativo |
| **Wizard / multi-step form** | `Wizard.jsx` + 9 `Paso*.jsx` | Un formulario de cientos de campos, digerible por pasos |
| **Local-first + debounced sync** | `Wizard.jsx` | Funciona sin conexión y sincroniza entre computadores sin bloquear nunca |
| **Fallback chain** | `cargarCliente()` | servidor → localStorage → tabla clientes → en blanco |
| **Table-driven config** | `PESTANAS`, `PASOS`, `FILAS_RESUMEN`, `CLAVES_TIPO`, `ENTREGA_TITULOS` | Agregar una pestaña o un paso es agregar una fila |
| **Facade** | `api.js` | Un solo lugar decide qué pasa con el token y con un 401 |
| **Event bus mínimo** | `window` + `'sesion-expirada'` | Logout global sin Context ni Redux |
| **Derived state** | `useMemo` sobre `liquidar()` | El cálculo se rehace en cada render sin recalcular a mano: es aritmética pura y barata |
| **Sandboxed preview** | `Prospectos.jsx > VistaPrevia`: `iframe srcDoc` con `sandbox=""` | El correo trae su propio `<style>`: aislado no altera el panel y no puede ejecutar nada |
| **Paginación como unidad de trabajo** | `Prospectos.jsx`: `POR_PAGINA = 20` | Una página es exactamente una tanda de envío del día |
| **Reutilización de componentes** | `ThOrdenable` (Clientes → Prospectos), `CascaronLegal` (Legal → Baja) | Un solo comportamiento de ordenar y un solo marco de página pública |

### Anti-patrones evitados a propósito

- **Sin ORM**: el esquema es pequeño y estable; un ORM añadiría una capa de
  indirección sobre 9 tablas sin ganar nada.
- **Sin gestor de estado global**: ninguna vista necesita el estado de otra. El
  único estado verdaderamente compartido es el token, y vive en `api.js`.
- **Sin framework de CSS**: un `styles.css` con la paleta en `:root` pesa menos
  que cualquier build de Tailwind y no impone otro paso de compilación.
- **Sin router**: cuatro rutas, resueltas con una regex de tres líneas.

---

## 10. Seguridad transversal

```mermaid
graph TB
    subgraph "Capa 1 — Borde: LiteSpeed + .htaccess"
        L1["mod_rewrite [F] → 403<br/>uploads · src · scripts · node_modules<br/>tmp · server.js · *.log · *.env · *.map"]
        L2["mod_headers<br/>replica la CSP y el caché<br/>para los estáticos que no pasan por Node"]
    end

    subgraph "Capa 2 — Aplicación"
        A1["cabeceras()<br/>CSP · HSTS · nosniff · DENY<br/>Referrer-Policy: no-referrer"]
        A2["limitador() por IP<br/>4 perfiles según sensibilidad"]
        A3["requiereAuth — Bearer HMAC<br/>cargarClientePortal — magic link"]
        A4["Turnstile en login y recuperación"]
    end

    subgraph "Capa 3 — Datos"
        D1["AES-256-GCM<br/>clave DIAN + liquidaciones210"]
        D2["Consultas parametrizadas<br/>mysql2 en todo datos.js"]
        D3["Uploads fuera del document root<br/>nombre aleatorio en disco"]
        D4["Validación de magic bytes"]
    end

    L1 --> A1
    L2 --> A1
    A1 --> A2 --> A3 --> A4
    A4 --> D1
    A4 --> D2
    A4 --> D3
    A4 --> D4

    style L1 fill:#7a1f1f,color:#fff
    style D1 fill:#123a63,color:#fff
```

### Superficie nueva de la captación

La única ruta pública que agregó la captación es `POST /api/portal/baja/:token`.
Solo acepta un token HMAC válido con el prefijo `baja:` (404 en cualquier otro
caso), queda bajo el limitador del portal y su único efecto es **reducir**
permisos: marcar al prospecto como dado de baja. No devuelve datos personales.

### Por qué `Referrer-Policy: no-referrer` no es opcional

El enlace del portal lleva el token **en la propia URL**. Sin esta cabecera,
cualquier recurso externo o enlace saliente recibiría el token completo en el
`Referer`. Es la razón por la que la CSP tampoco permite orígenes externos más
allá del widget de Turnstile.

### Los dos secretos y por qué están separados

| Secreto | Firma / cifra | Si se rota |
|---|---|---|
| `ADMIN_PASSWORD` | Token del panel **y** todos los enlaces del portal | Se invalidan todas las sesiones y **todos los enlaces de clientes** |
| `DATA_SECRET` | Clave DIAN y liquidaciones del 210 | **Lo cifrado queda ilegible para siempre.** No rotar |

Están separados a propósito: rotar la contraseña del panel es una operación
razonable de seguridad; perder los datos cifrados no lo es.

---

## 11. Pruebas

```bash
cd client && npm test        # Vitest
```

**156 pruebas en 20 archivos, ~1,3 s.** Todas sobre `motor210` — que es donde un
error tiene consecuencias reales frente a la DIAN.

| Qué se prueba | Cómo |
|---|---|
| Cada cédula por separado | `cedulas/*.test.js` — casos con topes al límite |
| Tablas normativas | `tablaImpuesto241`, `tablaArt73` — valores frontera de cada rango |
| El formulario completo | `formulario210.test.js` · `index.test.js` |
| Contra una declaración real | Cifras de un cliente AG2024 **anonimizadas**, extraídas del `.xlsm` que usaba la contadora |

El motor es puro, así que las pruebas no necesitan mocks, base de datos ni DOM.
Esa es exactamente la razón de haberlo mantenido puro.

### Backend

```bash
cd server && npm test        # node --test, sin dependencias
```

**12 pruebas** sobre las reglas de la captación, que tienen consecuencias
legales: festivos de Colombia (2026 y el cálculo de la Pascua en otro año),
todos los bordes del horario de la Ley 2300, el saludo, el escape de HTML en el
nombre, que la tabla de fechas no muestre plazos vencidos, las advertencias que
bloquean el envío y la separación de dominio de los tokens.

**Lo que no está cubierto por pruebas automáticas**: el resto del backend (rutas
y SQL), las vistas de React y los envíos de correo reales. Se validan a mano; `GET /api/correos/verificar`
diagnostica el canal de correo sin enviar nada.

> **Gate pendiente antes de usar el Liquidador con clientes reales**: validar
> 2–3 declaraciones de la temporada en paralelo contra el proceso anterior de la
> contadora, casilla por casilla.

---

## 12. Decisiones de arquitectura y sus porqués

Resumen para quien llega nuevo y se pregunta *"¿por qué está hecho así?"*.

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| Autenticación HMAC sin estado | Sesiones en memoria o en Redis | Passenger recicla procesos → daba 401 intermitentes. Redis no existe en este hosting |
| Correo por API HTTPS de Brevo | SMTP | El filtro saliente del proveedor marca el SMTP local como `550 SPAM` y bloquea el SMTP externo |
| Migraciones en el arranque | Herramienta de migraciones | Originalmente, no había shell para correrlas. Se mantiene porque `db.init()` converge el esquema en cada `restart` sin un paso manual que se pueda olvidar |
| Sin ORM | Sequelize / Prisma | 9 tablas estables; el SQL directo es más corto que la configuración del ORM |
| `motor210` en el navegador | Calcular en el servidor | Los datos tributarios del cliente nunca salen del computador de la contadora |
| Liquidaciones cifradas en el servidor | Solo `localStorage` | Poder continuar el mismo caso desde otro computador, sin que el servidor pueda leerlos |
| `envios` como candado | Estado en memoria | Es el único estado compartido entre los procesos de Passenger |
| Uploads fuera del document root | Solo reglas `.htaccess` | El app root **es** el document root: un `.htaccess` regenerado por cPanel expondría los PDFs de clientes. Ahora hay dos candados independientes |
| Despliegue por `scp` + `ssh` | Git pull en el servidor, o CI/CD | El servidor **sí** tiene `git`, así que un `pull` es viable a futuro. Hoy el repo no está clonado allá y el build del frontend se hace en local |
| Fechas en hora de Bogotá | UTC | La usuaria lee el historial directamente; convertir zonas solo introduce confusión |
| `seguridad.js` sin dependencias | `helmet` + `express-rate-limit` | Originalmente, cada dependencia obligaba a subir `node_modules` por SFTP. **Esa restricción ya no existe** (`npm install` corre por SSH); se mantiene porque son ~90 líneas que hacen exactamente lo que se necesita |
| C4-PlantUML para la estructura, Mermaid para lo dinámico | Todo en Mermaid | El C4 de Mermaid es experimental. Los SVG de PlantUML se generan con un comando y quedan versionados |
| `prospectos` en tabla propia | Columna `tipo` en `clientes` | Un prospecto no tiene portal, plantilla, clave DIAN ni alertas; mezclarlos obliga a filtrar en cada consulta de clientes |
| Prospecto = solo nombre y correo | Guardar NIT, actividad e ingresos de la base | Minimización (Ley 1581). Costo asumido: el correo muestra la tabla de plazos en vez de la fecha personal |
| Festivos calculados | Lista fija por año | Una lista caduca en silencio el 1 de enero |
| Baja con botón de confirmación | Baja al abrir el enlace | Los escáneres de enlaces del correo darían de baja a gente que no lo pidió |
| Tope de 20 correos de captación al día | Enviar la base completa | Reputación del remitente compartido con los correos a clientes |
| Español en el código | Inglés | Coincide con el dominio: `cedula`, `vencimiento`, `renta exenta` y `cédula general` no tienen traducción útil |

---

## 13. Buenas prácticas y estándares aplicados

Cada fila apunta a dónde verificarla en el repositorio. Si una práctica deja de
cumplirse, esta tabla debe corregirse en el mismo cambio.

### Arquitectura y código

| Práctica | Cómo se aplica | Evidencia |
|---|---|---|
| Modelo C4 + diagramas como código | Cinco niveles (contexto → código) con fuentes versionadas y render reproducible | `docs/diagramas/`, `render.sh` |
| Registro de decisiones (estilo ADR) | Cada decisión con la alternativa descartada y la razón | [§12](#12-decisiones-de-arquitectura-y-sus-porqués) |
| Separación en capas | HTTP → dominio → datos; el SQL vive en un solo archivo | `datos.js`; ningún `q(` fuera de él |
| Núcleo funcional | Cálculo tributario y reglas legales como funciones puras | `motor210/`, `horarioContacto.js` |
| Configuración por entorno ([12-factor](https://12factor.net/es/config)) | Secretos y parámetros en `.env`, nunca en el código | `server/.env.example` |
| Procesos sin estado (12-factor) | Tokens HMAC y candados en la base; nada compartido en memoria | `auth.js`, `datos.hayEnvioDesde()` |
| Migraciones idempotentes | El esquema converge en cada arranque | `db.js > init()` |
| Dependencias mínimas | 5 dependencias de producción en el backend | `server/package.json` |
| Comentarios que explican el porqué | Restricciones y decisiones, no narración del código | Todo `server/src/` |

### Seguridad (referencia: [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/))

| Práctica | Cómo se aplica | Evidencia |
|---|---|---|
| Consultas parametrizadas | Todo el SQL usa `?`; **cero** consultas armadas concatenando texto | `datos.js` |
| Comparación en tiempo constante | `igualSeguro()` compara `Buffer`s por tamaño en bytes | `auth.js` |
| Separación de dominio en tokens | Prefijos `portal:` y `baja:` en el HMAC | `auth.js`, prueba en `server/test/` |
| Cifrado autenticado en reposo | AES-256-GCM con una llave distinta de la del login | `cifrado.js` |
| Cabeceras de seguridad | CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer` | `seguridad.js` + `.htaccess` |
| Limitación de peticiones | Cuatro perfiles por IP según la sensibilidad de la ruta | `seguridad.js > limitador()` |
| Validación por contenido | Magic bytes, no extensión | `archivos.js > firmaValida()` |
| Mínima exposición | Archivos fuera del document root + reglas `[F]` | [§2](#2-infraestructura-y-despliegue) |
| Respuesta anti-enumeración | Misma respuesta exista o no la cédula | `POST /api/portal/recuperar` |
| Escape de datos no confiables | Todo dato editable se escapa antes de ir al HTML de un correo | `correo.js > escapeHtml()`, prueba en `server/test/` |
| Vista previa aislada | `iframe` con `sandbox=""` para el HTML del correo | `Prospectos.jsx` |

### Privacidad y cumplimiento

| Norma o estándar | Cómo se aplica | Evidencia |
|---|---|---|
| Ley 1581 de 2012 (habeas data) — minimización | Prospectos: solo nombre y correo; la importación ignora el resto de columnas | `datos.importarProspectos()` |
| Ley 1581 — derecho a no ser contactado | Baja en cada correo; quien se da de baja queda excluido para siempre | `{{baja}}`, `darDeBajaProspecto()` |
| Ley 2300 de 2023 — horarios de contacto | Validado en el servidor, con festivos calculados | `horarioContacto.js` + 12 pruebas |
| RFC 2369 / RFC 8058 — baja en un clic | Cabeceras `List-Unsubscribe` y `List-Unsubscribe-Post` | `enviarLoteCaptacion()` |
| Buenas prácticas de envío masivo | Tope diario, pausa entre correos, versión de texto plano | `correo.js` |
| Estatuto Tributario | Cada módulo del motor cita el artículo que implementa | `motor210/`, [reglas-tributarias-AG2025.md](reglas-tributarias-AG2025.md) |

### Experiencia de uso y accesibilidad

| Práctica | Cómo se aplica | Evidencia |
|---|---|---|
| Diseño móvil primero | Cada vista se revisa a 390 px antes de desplegar; modales como hoja inferior | `styles.css` (`@media (max-width: 600px)`) |
| Accesibilidad | `aria-label` en controles sin texto, `aria-live` en avisos, `focus-visible`, `prefers-reduced-motion` | `styles.css`, `Portal.jsx`, `Prospectos.jsx` |
| Prevención de errores | Selección limitada al cupo del día, confirmación antes de enviar, vista previa con las razones de omisión | `Prospectos.jsx` |

### Operación

| Práctica | Cómo se aplica | Evidencia |
|---|---|---|
| Respaldo antes de cambiar el esquema en producción | `mysqldump` previo al despliegue | `~/respaldos-renta/` en el servidor |
| Verificación posterior al despliegue | Contra un endpoint de la API, nunca contra un estático | [MANUAL-TECNICO §9](MANUAL-TECNICO.md#9-desarrollo-local-y-despliegue) |
| Historial de cambios | Cada entrega con qué cambió y por qué | [CHANGELOG.md](../CHANGELOG.md) |
| Sin datos personales en el historial de git | Los mensajes de commit nunca incluyen nombres ni datos de clientes | `git log` |

### Deuda conocida (declarada, no escondida)

| Pendiente | Riesgo | Plan |
|---|---|---|
| Sin integración continua | Las pruebas dependen de que alguien las corra | Workflow de GitHub Actions con `npm test` de cliente y servidor |
| Rutas y SQL del backend sin pruebas automáticas | Una regresión en una ruta se detecta a mano | Pruebas de integración contra MariaDB en contenedor |
| `cascada.js` duplicado en `liquidar()` | Dos implementaciones de la misma regla | Unificar ([§6](#6-motor-de-cálculo-motor210)) |
| `nodemailer` con avisos de `npm audit` | Bajo: producción envía por la API de Brevo, no por `sendMail` | Actualizar o retirar el canal SMTP |

---

## Para empezar a trabajar en el proyecto

```bash
# 1. Base de datos local (MariaDB en podman, 127.0.0.1:3307)
cd server && npm run db:local

# 2. Backend
cp .env.example .env      # editar ADMIN_PASSWORD y el canal de correo
npm install && npm run dev            # http://localhost:3001

# 3. Frontend (otra terminal)
cd client && npm install && npm run dev   # http://localhost:5173

# 4. Pruebas
cd client && npm test     # motor210 (Vitest)
cd server && npm test     # reglas del backend (node --test)
```

### Por dónde entrar según lo que vayas a tocar

| Si vas a… | Empieza leyendo |
|---|---|
| Agregar un endpoint | `server/src/app.js` → `server/src/datos.js` |
| Cambiar el esquema | `server/src/db.js` — patrón de migración con `information_schema` |
| Tocar un cálculo tributario | `docs/reglas-tributarias-AG2025.md` → el módulo en `motor210/` → **su test** |
| Cambiar un correo masivo | `server/src/seed.js` (plantilla) + `client/src/vistas/Correos.jsx` |
| Tocar la captación | `server/src/correo.js` (captación) + `horarioContacto.js` + **`server/test/`** |
| Cambiar un diagrama | `docs/diagramas/*.puml` → `docs/diagramas/render.sh` |
| Agregar una pestaña al panel | `client/src/App.jsx > PESTANAS` |
| Agregar un paso al Wizard | `client/src/vistas/liquidador210/Wizard.jsx > PASOS` |
| Entender qué ve el cliente | `client/src/vistas/Portal.jsx` |
| Desplegar | [MANUAL-TECNICO.md §9](MANUAL-TECNICO.md) |
