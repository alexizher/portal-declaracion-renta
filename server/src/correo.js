const nodemailer = require('nodemailer');
const datos = require('./datos');
const { vencimientoDe } = require('./vencimientos');
const { tokenPortal } = require('./auth');

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

// URL pública del portal de documentos de un cliente. BASE_URL viene del
// .env (p. ej. https://declaraciones-renta-pn.repolite.link); sin ella el
// enlace de los correos quedaría relativo e inservible.
function urlPortal(clienteId) {
  const base = (process.env.BASE_URL || '').replace(/\/+$/, '');
  return `${base}/portal/${tokenPortal(clienteId)}`;
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
    '{{portal}}': urlPortal(cliente.id),
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
      (config.cuerpo + config.asunto).includes('{{portal}}') &&
        !process.env.BASE_URL &&
        'El mensaje usa {{portal}} pero falta BASE_URL en el .env del servidor.',
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
const { ahoraBogota } = datos;

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

// ---------- Correo de resultado de la revisión (Fase 2) ----------

// A diferencia del recordatorio (cuyo mensaje es editable desde el panel),
// este correo se genera aquí con la paleta de la marca DM: resume qué quedó
// aprobado, qué se rechazó (y por qué) y qué falta por subir.
function renderCorreoRevision(cliente, checklist, config) {
  const aprobados = checklist.filter((d) => d.estado === 'aprobado');
  const rechazados = checklist.filter((d) => d.estado === 'rechazado');
  const pendientes = checklist.filter((d) => d.estado === 'pendiente');
  const enRevision = checklist.filter((d) => d.estado === 'subido');

  const seccion = (titulo, color, items) => {
    if (!items.length) return '';
    const filas = items
      .map(
        (d) => `<li style="margin:0 0 6px;">${d.nombre}${
          d.motivo ? `<br><em style="color:#8a6d1a;">Motivo: ${d.motivo}</em>` : ''
        }</li>`
      )
      .join('\n');
    return `
      <p style="margin:18px 0 6px;font-weight:bold;color:${color};">${titulo}</p>
      <ul style="margin:0;padding-left:20px;color:#2b3440;">${filas}</ul>`;
  };

  const logo = process.env.BASE_URL
    ? `<img src="${process.env.BASE_URL.replace(/\/+$/, '')}/logo_DM_120.png" width="60" height="60" alt="DM" style="border-radius:50%;display:block;margin:0 auto 8px;">`
    : '';

  const todoAprobado = rechazados.length === 0 && pendientes.length === 0 && enRevision.length === 0;
  const intro = todoAprobado
    ? '¡Buenas noticias! Todos tus documentos fueron revisados y aprobados. Con esto ya podemos preparar tu declaración.'
    : 'Revisamos los documentos que subiste al portal. Este es el estado de tu lista:';

  const boton = todoAprobado
    ? ''
    : `<p style="text-align:center;margin:24px 0;">
        <a href="${urlPortal(cliente.id)}" style="background:#152a45;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;display:inline-block;">Ir al portal de documentos</a>
      </p>`;

  const html = `
  <div style="background:#fbf8f6;padding:24px 12px;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.5;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e3ddd4;border-top:4px solid #c39a3b;border-radius:10px;padding:28px 32px;">
      ${logo}
      <h2 style="color:#152a45;font-size:18px;margin:0 0 12px;text-align:center;">Revisión de tus documentos</h2>
      <p style="color:#2b3440;">Hola <strong>${cliente.nombre}</strong>,</p>
      <p style="color:#2b3440;">${intro}</p>
      ${seccion('✔ Aprobados', '#1e7d51', aprobados)}
      ${seccion('✖ Para corregir (súbelos de nuevo)', '#c0392b', rechazados)}
      ${seccion('◦ Aún sin subir', '#7b8794', pendientes)}
      ${seccion('… En revisión', '#152a45', enRevision)}
      ${boton}
      <p style="color:#2b3440;">Si tienes alguna duda, responde a este correo y con gusto te orientamos.</p>
      <p style="color:#2b3440;margin-bottom:0;">Cordial saludo,<br><strong style="color:#152a45;">${
        config.remitente || 'Declaración de Renta'
      }</strong></p>
    </div>
  </div>`;

  return {
    asunto: todoAprobado
      ? 'Tus documentos fueron aprobados — declaración de renta'
      : 'Revisión de tus documentos — declaración de renta',
    html,
    texto: htmlAtexto(html),
  };
}

// Envía a un cliente el resultado de la revisión y lo registra en el
// historial con tipo "revision".
async function enviarRevision(clienteId) {
  const cliente = await datos.obtenerCliente(clienteId);
  if (!cliente) throw new Error('Cliente no encontrado.');
  if (!cliente.email) throw new Error('El cliente no tiene correo electrónico.');

  const [plantillas, config, documentos] = await Promise.all([
    datos.listarPlantillas(),
    datos.obtenerConfig(),
    datos.listarDocumentosDe(clienteId),
  ]);
  const plantilla = plantillas.find((p) => p.id === cliente.plantillaId);
  if (!plantilla) throw new Error('El cliente no tiene plantilla de documentos asignada.');

  const checklist = datos.armarChecklist(plantilla, documentos);
  const { asunto, html, texto } = renderCorreoRevision(cliente, checklist, config);

  const registro = {
    id: datos.nuevoId(),
    clienteId: cliente.id,
    nombre: cliente.nombre,
    email: cliente.email,
    fecha: ahoraBogota(),
    estado: 'enviado',
    error: null,
    tipo: 'revision',
  };
  try {
    await enviarCorreo({
      remitenteNombre: config.remitente || 'Declaración de Renta',
      para: cliente.email,
      asunto,
      texto,
      html,
    });
  } catch (err) {
    registro.estado = 'error';
    registro.error = err.message;
  }
  await datos.registrarEnvio(registro);
  return registro;
}

module.exports = {
  renderCorreo,
  renderCorreoRevision,
  enviarLote,
  enviarRevision,
  urlPortal,
  getTransporter,
  verificarEnvio,
};
