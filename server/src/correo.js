const nodemailer = require('nodemailer');
const datos = require('./datos');
const { vencimientoDe } = require('./vencimientos');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!user || !pass) {
      throw new Error('Configura GMAIL_USER y GMAIL_APP_PASSWORD en el archivo .env');
    }
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }
  return transporter;
}

function renderCorreo(cliente, plantillas, config, calendario) {
  const venc = vencimientoDe(cliente.cedula, calendario);
  const plantilla = plantillas.find((p) => p.id === cliente.plantillaId);
  const documentos = plantilla ? plantilla.documentos : [];

  const listaHtml = documentos.length
    ? `<ul>\n${documentos.map((d) => `  <li>${d}</li>`).join('\n')}\n</ul>`
    : '<p>(Sin documentos asignados)</p>';

  const reemplazos = {
    '{{nombre}}': cliente.nombre || '',
    '{{vencimiento}}': venc ? venc.fechaTexto : '(sin fecha — revisa la cédula)',
    '{{digitos}}': venc ? venc.digitos : '--',
    '{{documentos}}': listaHtml,
    '{{remitente}}': config.remitente || process.env.GMAIL_USER || '',
  };

  const aplicar = (texto) =>
    Object.entries(reemplazos).reduce(
      (acc, [marca, valor]) => acc.split(marca).join(valor),
      texto
    );

  return {
    asunto: aplicar(config.asunto),
    html: aplicar(config.cuerpo),
    vencimiento: venc,
    advertencias: [
      !venc && 'No se pudo calcular el vencimiento (cédula vacía o inválida).',
      !plantilla && 'El cliente no tiene plantilla de documentos asignada.',
      !cliente.email && 'El cliente no tiene correo electrónico.',
    ].filter(Boolean),
  };
}

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

// Envío secuencial con pausa entre correos para no disparar los límites
// anti-spam de Gmail (~500 correos/día en cuentas personales).
async function enviarLote(clienteIds) {
  const [plantillas, config, calendario] = await Promise.all([
    datos.listarPlantillas(),
    datos.obtenerConfig(),
    datos.obtenerCalendario(),
  ]);
  const resultados = [];

  for (const id of clienteIds) {
    const cliente = await datos.obtenerCliente(id);
    if (!cliente) continue;

    const registro = {
      id: datos.nuevoId(),
      clienteId: cliente.id,
      nombre: cliente.nombre,
      email: cliente.email,
      fecha: new Date().toISOString(),
      estado: 'enviado',
      error: null,
    };

    const { asunto, html, advertencias } = renderCorreo(cliente, plantillas, config, calendario);
    if (advertencias.length) {
      registro.estado = 'omitido';
      registro.error = advertencias.join(' ');
    } else {
      try {
        await getTransporter().sendMail({
          from: `"${config.remitente || 'Declaración de Renta'}" <${process.env.GMAIL_USER}>`,
          to: cliente.email,
          subject: asunto,
          html,
        });
        await datos.marcarUltimoEnvio(cliente.id, registro.fecha);
      } catch (err) {
        registro.estado = 'error';
        registro.error = err.message;
      }
      await pausa(1500);
    }

    await datos.registrarEnvio(registro);
    resultados.push(registro);
  }

  return resultados;
}

module.exports = { renderCorreo, enviarLote };
