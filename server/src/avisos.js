// Avisos internos para Daniela (correo configurable en config.correo_avisos):
//  - aviso cuando un cliente sube documentos al portal (con freno de 30 min
//    por cliente para no llegar un correo por cada archivo), y
//  - alerta diaria con los clientes que entran en un hito de vencimiento
//    (faltan 15, 8 o 3 días, o vencen hoy), excluyendo a los que ya declararon.
// Ambos quedan en el historial de envíos (tipos 'aviso-subida' y
// 'alerta-vencimiento'); la deduplicación se hace contra la base de datos
// porque Passenger corre varios procesos y los timers en memoria no bastan.

const datos = require('./datos');
const { vencimientoDe } = require('./vencimientos');
const { enviarCorreo, htmlAtexto } = require('./correo');

// Hitos de la alerta: días que faltan para el vencimiento.
const HITOS = [
  { dias: 15, titulo: 'Faltan 15 días', color: '#8a6d1a' },
  { dias: 8, titulo: 'Faltan 8 días', color: '#a35a1a' },
  { dias: 3, titulo: 'Faltan 3 días', color: '#c0392b' },
  { dias: 0, titulo: '⚠ VENCEN HOY (último día)', color: '#8e1f12' },
];

function hoyBogota() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bogota' });
}

function horaBogota() {
  return Number(
    new Date().toLocaleString('en-US', {
      timeZone: 'America/Bogota',
      hour: '2-digit',
      hour12: false,
    })
  );
}

// Días entre hoy (Bogotá) y una fecha YYYY-MM-DD. Negativo si ya pasó.
function diasHasta(fechaIso) {
  const [y, m, d] = fechaIso.split('-').map(Number);
  const [hy, hm, hd] = hoyBogota().split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(hy, hm - 1, hd)) / 86400000);
}

// Marco visual compartido de los correos internos (misma tarjeta de la marca
// DM que usa el correo de revisión).
function marco(titulo, contenidoHtml) {
  const logo = process.env.BASE_URL
    ? `<img src="${process.env.BASE_URL.replace(/\/+$/, '')}/logo_DM_120.png" width="48" height="48" alt="DM" style="border-radius:50%;display:block;margin:0 auto 8px;">`
    : '';
  const panel = (process.env.BASE_URL || '').replace(/\/+$/, '');
  const boton = panel
    ? `<p style="text-align:center;margin:22px 0 4px;">
        <a href="${panel}" style="background:#152a45;color:#ffffff;text-decoration:none;padding:11px 26px;border-radius:6px;display:inline-block;">Abrir el panel</a>
      </p>`
    : '';
  return `
  <div style="background:#fbf8f6;padding:24px 12px;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.5;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e3ddd4;border-top:4px solid #c39a3b;border-radius:10px;padding:26px 30px;">
      ${logo}
      <h2 style="color:#152a45;font-size:18px;margin:0 0 14px;text-align:center;">${titulo}</h2>
      ${contenidoHtml}
      ${boton}
      <p style="color:#7b8794;font-size:12px;text-align:center;margin:14px 0 0;">Aviso automático del portal de declaración de renta.</p>
    </div>
  </div>`;
}

// ---------- Aviso de subida de documentos ----------

// Se dispara tras cada subida exitosa del portal (fire-and-forget). Si a
// Daniela ya le llegó un aviso de este cliente en los últimos 30 minutos, no
// se repite: el cliente suele subir varios archivos seguidos.
async function avisarSubida(cliente) {
  const config = await datos.obtenerConfig();
  const para = (config.correo_avisos || '').trim();
  if (!para) return;

  const hace30min = new Date(Date.now() - 30 * 60000).toLocaleString('sv-SE', {
    timeZone: 'America/Bogota',
  });
  if (await datos.hayEnvioDesde('aviso-subida', hace30min, cliente.id)) return;

  const documentos = await datos.listarDocumentosDe(cliente.id);
  const porRevisar = documentos.filter((d) => d.estado === 'subido');
  const filas = porRevisar
    .map((d) => `<li style="margin:0 0 6px;">${d.nombre}</li>`)
    .join('\n');

  const html = marco(
    'Documentos nuevos en el portal',
    `<p style="color:#2b3440;"><strong>${cliente.nombre}</strong> subió documentos a su portal.</p>
     <p style="margin:14px 0 6px;font-weight:bold;color:#152a45;">Por revisar (${porRevisar.length}):</p>
     <ul style="margin:0;padding-left:20px;color:#2b3440;">${filas}</ul>
     <p style="color:#7b8794;font-size:13px;margin-top:14px;">Si sube más archivos en los próximos 30 minutos no te llegará otro correo; revisa la pestaña Revisión.</p>`
  );

  const registro = {
    id: datos.nuevoId(),
    clienteId: cliente.id,
    nombre: cliente.nombre,
    email: para,
    fecha: datos.ahoraBogota(),
    estado: 'enviado',
    error: null,
    tipo: 'aviso-subida',
  };
  try {
    await enviarCorreo({
      remitenteNombre: config.remitente || 'Portal declaración de renta',
      para,
      asunto: `📄 ${cliente.nombre} subió documentos al portal`,
      texto: htmlAtexto(html),
      html,
    });
  } catch (err) {
    registro.estado = 'error';
    registro.error = err.message;
  }
  await datos.registrarEnvio(registro);
}

// ---------- Alerta diaria de vencimientos próximos ----------

// Busca clientes (no marcados "ya declaró") cuyo vencimiento cae exactamente
// en un hito. Devuelve [{hito, clientes: [...]}] solo con hitos no vacíos.
async function clientesEnHitos() {
  const [clientes, calendario] = await Promise.all([
    datos.listarClientes(),
    datos.obtenerCalendario(),
  ]);
  return HITOS.map((hito) => ({
    hito,
    clientes: clientes.filter((c) => {
      if (c.declarado) return false;
      const venc = vencimientoDe(c.cedula, calendario);
      return venc && diasHasta(venc.fecha) === hito.dias;
    }),
  })).filter((g) => g.clientes.length > 0);
}

// Revisa y envía la alerta del día si corresponde. La llama un timer interno
// cada 30 minutos y también el endpoint /api/cron/alertas (para un cron de
// cPanel que además despierta la app si Passenger la durmió).
// opciones.ignorarHorario: el cron manda a la hora que sea.
async function revisarVencimientos(opciones = {}) {
  const config = await datos.obtenerConfig();
  const para = (config.correo_avisos || '').trim();
  if (!para) return { enviado: false, motivo: 'Sin correo_avisos configurado.' };

  // El timer interno solo actúa en horario razonable (7 am – 9 pm Bogotá).
  const hora = horaBogota();
  if (!opciones.ignorarHorario && (hora < 7 || hora >= 21)) {
    return { enviado: false, motivo: 'Fuera de horario.' };
  }

  const hoy = hoyBogota();
  if (await datos.hayEnvioDesde('alerta-vencimiento', `${hoy} 00:00:00`)) {
    return { enviado: false, motivo: 'La alerta de hoy ya se envió.' };
  }

  const grupos = await clientesEnHitos();
  if (!grupos.length) {
    return { enviado: false, motivo: 'Ningún cliente entra hoy en un hito (15/8/3/0 días).' };
  }

  const calendario = await datos.obtenerCalendario();
  const seccion = ({ hito, clientes }) => {
    const filas = clientes
      .map((c) => {
        const venc = vencimientoDe(c.cedula, calendario);
        const contacto = [c.telefono, c.email].filter(Boolean).join(' · ');
        return `<tr>
          <td style="padding:6px 8px;border-bottom:1px solid #eee6da;color:#2b3440;"><strong>${c.nombre}</strong>${
            contacto ? `<br><span style="color:#7b8794;font-size:12px;">${contacto}</span>` : ''
          }</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee6da;color:${hito.color};white-space:nowrap;">${venc.fechaTexto}</td>
        </tr>`;
      })
      .join('\n');
    return `
      <p style="margin:18px 0 6px;font-weight:bold;color:${hito.color};">${hito.titulo} — ${clientes.length} cliente(s)</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px;">${filas}</table>`;
  };

  const total = grupos.reduce((n, g) => n + g.clientes.length, 0);
  const hayUltimoDia = grupos.some((g) => g.hito.dias === 0);
  const html = marco(
    'Clientes próximos a declarar',
    `<p style="color:#2b3440;">Estos clientes llegan hoy a un hito de su plazo. Los marcados como "ya declaró" no aparecen.</p>
     ${grupos.map(seccion).join('\n')}`
  );

  const registro = {
    id: datos.nuevoId(),
    clienteId: '',
    nombre: `Alerta de vencimientos (${total} cliente${total === 1 ? '' : 's'})`,
    email: para,
    fecha: datos.ahoraBogota(),
    estado: 'enviado',
    error: null,
    tipo: 'alerta-vencimiento',
  };
  try {
    await enviarCorreo({
      remitenteNombre: config.remitente || 'Portal declaración de renta',
      para,
      asunto: hayUltimoDia
        ? `🔴 HOY vencen declaraciones — ${total} cliente(s) en hitos`
        : `⏰ Vencimientos próximos — ${total} cliente(s) en hitos`,
      texto: htmlAtexto(html),
      html,
    });
  } catch (err) {
    registro.estado = 'error';
    registro.error = err.message;
  }
  await datos.registrarEnvio(registro);
  return { enviado: registro.estado === 'enviado', error: registro.error, clientes: total };
}

module.exports = { avisarSubida, revisarVencimientos, clientesEnHitos, diasHasta };
