// Tabla escalonada del Art. 206 numeral 4 ET: el % exento de las cesantías
// e intereses de cesantías se reduce según el salario mensual promedio del
// trabajador, expresado en UVT. Confirmada en DATOS INICIALES!D65-D73 del
// .xlsm de referencia (ver docs/reglas-tributarias-AG2025.md).
const TRAMOS = [
  { hasta: 350, porcentaje: 1 },
  { hasta: 410, porcentaje: 0.9 },
  { hasta: 470, porcentaje: 0.8 },
  { hasta: 530, porcentaje: 0.6 },
  { hasta: 590, porcentaje: 0.4 },
  { hasta: 650, porcentaje: 0.2 },
  { hasta: Infinity, porcentaje: 0 },
];

/**
 * @param {number} salarioMensualPromedio Ingreso mensual promedio de los
 *   últimos 6 meses de vinculación (renglón 59 del certificado F220).
 * @param {number} valorUvt
 * @returns {number} Porcentaje exento (0 a 1) aplicable a las cesantías.
 */
export function porcentajeExentoCesantias(salarioMensualPromedio, valorUvt) {
  const salarioUvt = salarioMensualPromedio / valorUvt;
  return TRAMOS.find((t) => salarioUvt <= t.hasta).porcentaje;
}
