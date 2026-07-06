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
  })
  .catch((err) => {
    console.error('No se pudo conectar a la base de datos:', err.message);
    console.error('Revisa DB_HOST, DB_USER, DB_PASSWORD y DB_NAME en el .env');
    process.exit(1);
  });
