// Estado de entrega de los correos de captación, a partir de los eventos de
// Brevo (GET /v3/smtp/statistics/events). Marca a cada prospecto como
// entregado, diferido, temporal o rebote, y excluye de futuros envíos a quien
// rebotó de forma permanente o se quejó de spam.
//
// La clasificación (clasificarEventos) es una función pura; la consulta a
// Brevo y la escritura en la base están separadas para poder probarla sin red.

const datos = require('./datos');

// Tipo de evento de Brevo → qué significa para el prospecto.
//   terminal: el correo no volverá a funcionar (o la persona no quiere más).
//   estado:   estado del prospecto que se aplica cuando el evento es terminal.
const EVENTOS = {
  hardBounces: { entrega: 'rebote', terminal: true, estado: 'rebote' },
  invalid: { entrega: 'rebote', terminal: true, estado: 'rebote' },
  blocked: { entrega: 'rebote', terminal: true, estado: 'rebote' },
  spam: { entrega: 'spam', terminal: true, estado: 'baja' },
  unsubscribed: { entrega: 'baja', terminal: true, estado: 'baja' },
  softBounces: { entrega: 'temporal', terminal: false },
  deferred: { entrega: 'diferido', terminal: false },
  delivered: { entrega: 'entregado', terminal: false },
};

const TIPOS_EVENTO = Object.keys(EVENTOS);

// Agrupa los eventos por correo y decide el estado de entrega de cada uno:
// un evento terminal gana siempre (un rebote no se "cura" con un reintento);
// entre los no terminales manda el más reciente (diferido → entregado).
// Devuelve Map(email → { entrega, detalle, fecha, estado|null }).
function clasificarEventos(eventos) {
  const porCorreo = new Map();
  for (const e of eventos) {
    const regla = EVENTOS[e.tipo];
    const email = String(e.email || '').trim().toLowerCase();
    if (!regla || !email) continue;
    if (!porCorreo.has(email)) porCorreo.set(email, []);
    porCorreo.get(email).push({ ...e, regla });
  }

  const resultado = new Map();
  for (const [email, lista] of porCorreo) {
    lista.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    const terminales = lista.filter((e) => e.regla.terminal);
    const elegido = terminales.length ? terminales[terminales.length - 1] : lista[lista.length - 1];
    resultado.set(email, {
      entrega: elegido.regla.entrega,
      detalle: String(elegido.motivo || '').split(/\s+/).join(' ').slice(0, 250),
      fecha: elegido.fecha,
      estado: elegido.regla.estado || null,
    });
  }
  return resultado;
}

// Trae de Brevo los eventos de los últimos `dias` días, por tipo y paginados.
async function consultarEventosBrevo(dias) {
  const eventos = [];
  for (const tipo of TIPOS_EVENTO) {
    for (let offset = 0; ; offset += 2500) {
      const url = `https://api.brevo.com/v3/smtp/statistics/events?event=${tipo}&days=${dias}&limit=2500&offset=${offset}`;
      const res = await fetch(url, { headers: { 'api-key': process.env.BREVO_API_KEY } });
      if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
      const lote = (await res.json()).events || [];
      for (const e of lote) eventos.push({ tipo, email: e.email, fecha: e.date, motivo: e.reason });
      if (lote.length < 2500) break;
    }
  }
  return eventos;
}

// Aplica la clasificación a la tabla prospectos. Solo toca a quien es
// prospecto (los clientes no se modifican) y nunca devuelve a "contactable"
// a alguien que ya es cliente, se dio de baja o rebotó.
async function sincronizarEntregas({ dias = 7 } = {}) {
  if (!process.env.BREVO_API_KEY) {
    return { error: 'Sin BREVO_API_KEY: el estado de entrega solo se consulta con Brevo.' };
  }
  const clasificacion = clasificarEventos(await consultarEventosBrevo(dias));
  const resumen = { revisados: 0, entregados: 0, temporales: 0, rebotes: 0, bajas: 0, marcadosAhora: [] };

  for (const [email, info] of clasificacion) {
    const p = await datos.obtenerProspectoPorEmail(email);
    if (!p) continue;
    resumen.revisados += 1;
    if (info.entrega === 'entregado') resumen.entregados += 1;
    else if (info.entrega === 'temporal' || info.entrega === 'diferido') resumen.temporales += 1;
    else if (info.estado === 'rebote') resumen.rebotes += 1;
    else if (info.estado === 'baja') resumen.bajas += 1;

    const cambiaEstado = info.estado && !['convertido', 'baja', 'rebote'].includes(p.estado);
    await datos.registrarEntregaProspecto(p.id, {
      entrega: info.entrega,
      detalle: info.detalle,
      fecha: info.fecha,
      estado: cambiaEstado ? info.estado : null,
    });
    if (cambiaEstado) resumen.marcadosAhora.push({ email, estado: info.estado, detalle: info.detalle });
  }

  await datos.guardarConfig({ captacion_ultima_revision: datos.ahoraBogota() });
  return resumen;
}

module.exports = { EVENTOS, clasificarEventos, sincronizarEntregas };
