require('dotenv').config();

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
