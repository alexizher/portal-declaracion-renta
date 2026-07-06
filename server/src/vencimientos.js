const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// Los dos últimos dígitos numéricos del documento (cédula o NIT sin dígito
// de verificación). "1.030.567.890" -> 90
function ultimosDosDigitos(documento) {
  const soloDigitos = String(documento || '').replace(/\D/g, '');
  if (!soloDigitos) return null;
  return parseInt(soloDigitos.slice(-2), 10);
}

// `calendario` es la lista [{digitos: [1,2], fecha: 'YYYY-MM-DD'}, ...]
// que entrega datos.obtenerCalendario(); se pasa como argumento para no
// consultar la base de datos por cada cliente.
function vencimientoDe(documento, calendario) {
  const dd = ultimosDosDigitos(documento);
  if (dd === null) return null;
  const entrada = (calendario || []).find((e) => e.digitos.includes(dd));
  if (!entrada) return null;
  return {
    digitos: String(dd).padStart(2, '0'),
    fecha: entrada.fecha,
    fechaTexto: fechaLarga(entrada.fecha),
  };
}

function fechaLarga(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} de ${MESES[m - 1]} de ${y}`;
}

module.exports = { vencimientoDe, ultimosDosDigitos, fechaLarga };
