const nodemailer = require('nodemailer');
const datos = require('./datos');
const { vencimientoDe } = require('./vencimientos');

let transporter = null;

// Con SMTP_HOST definido se usa un SMTP genérico (p. ej. el servidor de
// correo del propio hosting, ya que los hostings compartidos bloquean la
// salida hacia SMTP externos como Gmail). Sin SMTP_HOST, Gmail directo
// (útil en desarrollo local).
function getTransporter() {
  if (!transporter) {
    const host = process.env.SMTP_HOST;
    if (host) {
      const port = Number(process.env.SMTP_PORT || 587);
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: process.env.SMTP_SECURE !== undefined
          ? process.env.SMTP_SECURE === 'true'
          : port === 465,
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
        // El certificado del servidor de correo del hosting puede no coincidir
        // con "localhost".
        tls: { rejectUnauthorized: false },
      });
    } else {
      const user = process.env.GMAIL_USER;
      const pass = process.env.GMAIL_APP_PASSWORD;
      if (!user || !pass) {
        throw new Error('Configura GMAIL_USER y GMAIL_APP_PASSWORD (o SMTP_HOST) en el archivo .env');
      }
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
    }
  }
  return transporter;
}

// Dirección desde la que salen los correos (debe pertenecer al dominio del
// SMTP usado para no caer en spam). Las respuestas del cliente van a REPLY_TO.
function remitenteEmail() {
  return process.env.FROM_EMAIL || process.env.SMTP_USER || process.env.GMAIL_USER;
}

// Con BREVO_API_KEY definida los correos salen por la API HTTPS de Brevo en
// lugar de SMTP (el hosting bloquea SMTP externo y su filtro saliente rechaza
// el SMTP local). El remitente (FROM_EMAIL) debe estar verificado en Brevo.
async function enviarCorreo({ remitenteNombre, para, asunto, texto, html }) {
  const replyTo = process.env.REPLY_TO || process.env.GMAIL_USER || undefined;
  if (process.env.BREVO_API_KEY) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: remitenteNombre, email: remitenteEmail() },
        to: [{ email: para }],
        replyTo: replyTo ? { email: replyTo } : undefined,
        subject: asunto,
        textContent: texto,
        htmlContent: html,
      }),
    });
    if (!res.ok) {
      throw new Error(`Brevo ${res.status}: ${await res.text()}`);
    }
    return;
  }
  await getTransporter().sendMail({
    from: `"${remitenteNombre}" <${remitenteEmail()}>`,
    to: para,
    replyTo,
    subject: asunto,
    text: texto,
    html,
  });
}

// Diagnóstico del canal de envío configurado, sin enviar ningún correo.
async function verificarEnvio() {
  if (process.env.BREVO_API_KEY) {
    const res = await fetch('https://api.brevo.com/v3/account', {
      headers: { 'api-key': process.env.BREVO_API_KEY },
    });
    if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
    const cuenta = await res.json();
    return `Conexión con Brevo correcta (${cuenta.email}).`;
  }
  await getTransporter().verify();
  return 'Conexión SMTP correcta.';
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

  const html = aplicar(config.cuerpo);
  return {
    asunto: aplicar(config.asunto),
    html,
    texto: htmlAtexto(html),
    vencimiento: venc,
    advertencias: [
      !venc && 'No se pudo calcular el vencimiento (cédula vacía o inválida).',
      !plantilla && 'El cliente no tiene plantilla de documentos asignada.',
      !cliente.email && 'El cliente no tiene correo electrónico.',
    ].filter(Boolean),
  };
}

// Versión de texto plano a partir del HTML: incluirla reduce el puntaje de
// spam (un correo solo-HTML es sospechoso) y sirve a clientes sin HTML.
function htmlAtexto(html) {
  return html
    .replace(/<li>/gi, '\n • ')
    .replace(/<\/(p|div|h[1-6]|ul|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

// Fecha y hora de Colombia en "YYYY-MM-DD HH:mm:ss" (formato sv-SE). El
// historial se guarda y se muestra en hora local del negocio; guardar UTC
// hacía que el panel mostrara los envíos con 5 horas de diferencia.
function ahoraBogota() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'America/Bogota' });
}

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
      fecha: ahoraBogota(),
      estado: 'enviado',
      error: null,
    };

    const { asunto, html, texto, advertencias } = renderCorreo(cliente, plantillas, config, calendario);
    if (advertencias.length) {
      registro.estado = 'omitido';
      registro.error = advertencias.join(' ');
    } else {
      try {
        await enviarCorreo({
          remitenteNombre: config.remitente || 'Declaración de Renta',
          para: cliente.email,
          asunto,
          texto,
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

module.exports = { renderCorreo, enviarLote, getTransporter, verificarEnvio };
