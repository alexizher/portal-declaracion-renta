// Horario permitido para contactar con fines publicitarios (Ley 2300 de
// 2023, art. 3): lunes a viernes de 7:00 a. m. a 7:00 p. m. y sábados de
// 8:00 a. m. a 3:00 p. m.; nunca domingos ni festivos. Aplica a los correos
// de captación de prospectos, no a los mensajes a clientes (que son parte
// del servicio contratado, no publicidad).

// Domingo de Pascua (algoritmo de Meeus/Butcher, calendario gregoriano).
function pascua(anio) {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(anio, mes - 1, dia);
}

const DIA_MS = 86400000;
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

// Ley Emiliani (Ley 51 de 1983): estos festivos se corren al lunes siguiente.
function aLunes(ms) {
  const dow = new Date(ms).getUTCDay();
  return dow === 1 ? ms : ms + ((8 - dow) % 7) * DIA_MS;
}

function festivosColombia(anio) {
  const fijo = (mes, dia) => Date.UTC(anio, mes - 1, dia);
  const p = pascua(anio);
  return new Set(
    [
      fijo(1, 1),
      aLunes(fijo(1, 6)), // Reyes Magos
      aLunes(fijo(3, 19)), // San José
      p - 3 * DIA_MS, // Jueves Santo
      p - 2 * DIA_MS, // Viernes Santo
      fijo(5, 1),
      aLunes(p + 39 * DIA_MS), // Ascensión
      aLunes(p + 60 * DIA_MS), // Corpus Christi
      aLunes(p + 68 * DIA_MS), // Sagrado Corazón
      aLunes(fijo(6, 29)), // San Pedro y San Pablo
      fijo(7, 20),
      fijo(8, 7),
      aLunes(fijo(8, 15)), // Asunción
      aLunes(fijo(10, 12)), // Día de la Raza
      aLunes(fijo(11, 1)), // Todos los Santos
      aLunes(fijo(11, 11)), // Independencia de Cartagena
      fijo(12, 8),
      fijo(12, 25),
    ].map(iso)
  );
}

const HORARIO_TEXTO =
  'lunes a viernes de 7:00 a. m. a 7:00 p. m. y sábados de 8:00 a. m. a 3:00 p. m. (sin domingos ni festivos)';

// `ahora` en "YYYY-MM-DD HH:mm:ss" hora Bogotá (datos.ahoraBogota()).
function puedeContactar(ahora) {
  const [fecha, hora] = ahora.split(' ');
  const [y, m, d] = fecha.split('-').map(Number);
  const [hh, mm] = hora.split(':').map(Number);
  const minutos = hh * 60 + mm;
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();

  let motivo = null;
  if (festivosColombia(y).has(fecha)) motivo = 'Hoy es festivo.';
  else if (dow === 0) motivo = 'Hoy es domingo.';
  else if (dow === 6 && (minutos < 8 * 60 || minutos >= 15 * 60)) motivo = 'Los sábados solo se puede de 8:00 a. m. a 3:00 p. m.';
  else if (dow !== 6 && (minutos < 7 * 60 || minutos >= 19 * 60)) motivo = 'Entre semana solo se puede de 7:00 a. m. a 7:00 p. m.';

  return motivo
    ? { ok: false, motivo: `${motivo} La Ley 2300 de 2023 permite contactar con publicidad ${HORARIO_TEXTO}.` }
    : { ok: true, motivo: null };
}

module.exports = { puedeContactar, festivosColombia, HORARIO_TEXTO };
