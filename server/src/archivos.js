// Almacenamiento de los archivos que los clientes suben desde el portal.
// Viven en una carpeta privada (fuera de public/) y solo salen por la API
// autenticada del panel; el nombre en disco es aleatorio y el nombre original
// se guarda en la base de datos.

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');

const EXTENSIONES = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
]);

const TAMANO_MAX = 15 * 1024 * 1024; // 15 MB

function rutaDe(clienteId, archivo) {
  return path.join(UPLOADS_DIR, clienteId, archivo);
}

function borrarArchivo(clienteId, archivo) {
  if (!archivo) return;
  fs.promises.unlink(rutaDe(clienteId, archivo)).catch(() => {});
}

// Al eliminar un cliente se va toda su carpeta de subidas.
function borrarCarpetaCliente(clienteId) {
  if (!clienteId) return;
  fs.promises.rm(path.join(UPLOADS_DIR, clienteId), { recursive: true, force: true }).catch(() => {});
}

// El middleware que valida el token del portal ya dejó req.clienteId.
const almacen = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(UPLOADS_DIR, req.clienteId);
    fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

const subir = multer({
  storage: almacen,
  limits: { fileSize: TAMANO_MAX, files: 1 },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!EXTENSIONES.has(ext)) {
      return cb(
        new Error('Tipo de archivo no permitido. Sube PDF, imagen (JPG/PNG) o documento de Office.')
      );
    }
    cb(null, true);
  },
});

// Envuelve multer para responder sus errores en JSON y en español.
function subirArchivo(req, res, next) {
  subir.single('archivo')(req, res, (err) => {
    if (!err) return next();
    const mensaje =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'El archivo supera el tamaño máximo de 15 MB.'
        : err.message;
    res.status(400).json({ error: mensaje });
  });
}

// Multer entrega el nombre original en latin1; los acentos y eñes llegan
// rotos si no se reinterpreta como UTF-8.
function nombreOriginal(file) {
  return Buffer.from(file.originalname, 'latin1').toString('utf8');
}

module.exports = {
  UPLOADS_DIR,
  rutaDe,
  borrarArchivo,
  borrarCarpetaCliente,
  subirArchivo,
  nombreOriginal,
};
