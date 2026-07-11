// override: true → el archivo .env manda sobre las variables del panel
// (cPanel las inyecta vía SetEnv en .htaccess y su editor a veces no las
// guarda o LiteSpeed altera valores con caracteres especiales).
require('dotenv').config({ override: true });

const db = require('./src/db');

const PORT = process.env.PORT || 3001;

db.init()
  .then(() => {
    const app = require('./src/app');
    app.listen(PORT, () => {
      console.log(`Notificador de renta escuchando en puerto ${PORT}`);
    });

    // Alerta diaria de vencimientos: se revisa cada 30 minutos (la
    // deduplicación por día vive en la base de datos, así que da igual que
    // Passenger corra varios procesos o reinicie). Complemento del endpoint
    // /api/cron/alertas, que además despierta la app si estaba dormida.
    const { revisarVencimientos } = require('./src/avisos');
    const revisar = () =>
      revisarVencimientos().catch((err) => console.error('Alerta de vencimientos:', err.message));
    setTimeout(revisar, 30_000);
    setInterval(revisar, 30 * 60 * 1000);
  })
  .catch((err) => {
    console.error('No se pudo conectar a la base de datos:', err.message);
    console.error('Revisa DB_HOST, DB_USER, DB_PASSWORD y DB_NAME en el .env');
    process.exit(1);
  });
