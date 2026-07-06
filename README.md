# Portal Declaración de Renta

Sistema para gestión de clientes de declaración de renta (Colombia).

**Fase 1 (actual) — Notificador:** panel de administración para importar la lista de
clientes (Excel/CSV), calcular la fecha de vencimiento DIAN según los dos últimos
dígitos de la cédula/NIT, y enviarles por correo el recordatorio con la lista de
documentos que deben preparar.

**Fase 2 (próxima) — Portal de documentos:** los clientes suben cada documento
solicitado, el administrador los valida (correcto / rechazado) y al final el sistema
notifica qué quedó aprobado y qué deben volver a subir.

## Estructura

```
server/   API Express (Node 20) + sirve el frontend compilado desde server/public
client/   Panel de administración en React + Vite
```

Los datos viven en **MySQL/MariaDB** (tablas: clientes, plantillas, calendario,
config, envios). Las tablas se crean y se precargan solas al primer arranque.

## Desarrollo local

Requiere podman (o Docker) solo para la base de datos local:

```bash
# 1. Base de datos (contenedor MariaDB en 127.0.0.1:3307)
cd server
npm run db:local

# 2. Backend
cp .env.example .env   # editar: ADMIN_PASSWORD, GMAIL_USER, GMAIL_APP_PASSWORD
npm install
npm run dev            # http://localhost:3001

# 2. Frontend (otra terminal)
cd client
npm install
npm run dev            # http://localhost:5173 (proxy /api -> 3001)
```

El envío usa Gmail por SMTP con una **contraseña de aplicación**
(https://myaccount.google.com/apppasswords, requiere verificación en 2 pasos).
Límite de Gmail personal: ~500 correos/día.

## Despliegue en el hosting (cPanel + Node.js Selector)

1. Crear la base de datos en cPanel → **MySQL Databases**: una DB, un usuario y
   asignarle todos los privilegios (cPanel antepone el prefijo de la cuenta,
   ej. `repolite_renta`).
2. Compilar el frontend: `cd client && npm run build` (queda en `server/public/`).
3. En cPanel → **Setup Node.js App**: crear la app con Node **20.20.2**, application
   root apuntando a la carpeta del proyecto, startup file `server.js`.
4. Subir por SFTP el contenido de `server/` (incluido `public/`, sin `node_modules`).
5. Configurar las variables de entorno en el panel de la app: `ADMIN_PASSWORD`,
   `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `DB_HOST=localhost`, `DB_PORT=3306`,
   `DB_NAME`, `DB_USER`, `DB_PASSWORD`.
6. Botón **Run NPM Install** (dependencias livianas: express, mysql2, nodemailer,
   dotenv) y luego **Restart**. Las tablas se crean solas al arrancar.

Si existían datos de la versión JSON (`server/data/*.json`), migrarlos con
`npm run migrar-json`.

## Calendario DIAN

El calendario 2026 (año gravable 2025) viene precargado: vencimientos del 12 de
agosto al 26 de octubre de 2026 por pares de dígitos. Es editable desde la pestaña
"Calendario DIAN"; verificar siempre contra el
[calendario oficial](https://www.dian.gov.co/Calendarios/Calendario_Tributario_2026.pdf).
