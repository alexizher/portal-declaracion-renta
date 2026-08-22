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

// Valida los primeros bytes del archivo contra la extensión declarada (el
// fileFilter de multer solo mira el nombre, que cualquiera puede falsear
// renombrando un .exe a .pdf). Solo rechaza cuando la firma NO coincide con
// ninguna variante conocida del formato; ante cualquier duda (formato con
// firma más variable, como HEIC) se es permisivo para no bloquear subidas
// legítimas de clientes reales.
function firmaValida(buf, ext) {
  if (buf.length < 8) return false;
  const byte = (i) => buf[i];
  switch (ext) {
    case '.pdf':
      return buf.subarray(0, 5).toString('latin1') === '%PDF-';
    case '.jpg':
    case '.jpeg':
      return byte(0) === 0xff && byte(1) === 0xd8 && byte(2) === 0xff;
    case '.png':
      return buf
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case '.webp':
      return (
        buf.subarray(0, 4).toString('latin1') === 'RIFF' &&
        buf.subarray(8, 12).toString('latin1') === 'WEBP'
      );
    case '.heic':
      // Caja ISO-BMF "ftyp" en el offset 4: cubre las variantes heic/heix/
      // mif1/msf1/heim/heis sin tener que enumerar cada marca de fábrica.
      return buf.subarray(4, 8).toString('latin1') === 'ftyp';
    case '.doc':
    case '.xls':
      // Formato binario OLE de Office 97-2003.
      return buf
        .subarray(0, 8)
        .equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
    case '.docx':
    case '.xlsx':
      // Office Open XML: en realidad un .zip (PK\x03\x04, o PK\x05\x06 si
      // llegara vacío, caso que en la práctica no ocurre con estos formatos).
      return byte(0) === 0x50 && byte(1) === 0x4b && (byte(2) === 0x03 || byte(2) === 0x05);
    default:
      return true;
  }
}

// Lee los primeros 16 bytes del archivo ya guardado en disco.
async function leerCabecera(ruta) {
  const fh = await fs.promises.open(ruta, 'r');
  try {
    const buf = Buffer.alloc(16);
    const { bytesRead } = await fh.read(buf, 0, 16, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await fh.close();
  }
}

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

// Envuelve multer para responder sus errores en JSON y en español, y de paso
// verifica que el contenido real del archivo corresponda a su extensión.
function subirArchivo(req, res, next) {
  subir.single('archivo')(req, res, (err) => {
    if (err) {
      const mensaje =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'El archivo supera el tamaño máximo de 15 MB.'
          : err.message;
      return res.status(400).json({ error: mensaje });
    }
    if (!req.file) return next();

    const ext = path.extname(req.file.originalname).toLowerCase();
    leerCabecera(req.file.path)
      .then((cabecera) => {
        if (!firmaValida(cabecera, ext)) {
          fs.promises.unlink(req.file.path).catch(() => {});
          return res.status(400).json({
            error: 'El archivo no corresponde con su extensión (¿está corrupto o mal renombrado?).',
          });
        }
        next();
      })
      .catch((errLectura) => {
        console.error('Verificación de archivo subido:', errLectura.message);
        fs.promises.unlink(req.file.path).catch(() => {});
        res.status(500).json({ error: 'No se pudo verificar el archivo subido.' });
      });
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
