import { redondearMiles } from '../redondeo.js';

// Tabla progresiva "grandfather" para dividendos y participaciones
// provenientes de utilidades generadas en 2016 y años anteriores — TABLAS
// filas 47-50 del .xlsm de referencia. Tarifas más bajas y menos tramos que
// la tabla general del Art. 241 ET (tablaImpuesto241.js) porque estas
// utilidades ya venían con un tratamiento preferencial bajo el régimen
// anterior a la Ley 1819 de 2016.
const TRAMOS = [
  { desde: 0, hasta: 1090, tarifa: 0, base: 0, restarUvt: 0 },
  { desde: 1090, hasta: 1700, tarifa: 0.19, base: 0, restarUvt: 1090 },
  { desde: 1700, hasta: 4100, tarifa: 0.28, base: 116, restarUvt: 1700 },
  { desde: 4100, hasta: Infinity, tarifa: 0.33, base: 788, restarUvt: 4100 },
];

/**
 * @param {number} baseGravableEnPesos Renta líquida de dividendos 2016 y
 *   años anteriores (en pesos).
 * @param {number} valorUvt UVT del año gravable.
 * @returns {number} Impuesto en pesos, redondeado a la unidad de mil.
 */
export function impuestoDividendos2016(baseGravableEnPesos, valorUvt) {
  const baseUvt = baseGravableEnPesos / valorUvt;
  const tramo = TRAMOS.find((t) => baseUvt > t.desde && baseUvt <= t.hasta) ?? TRAMOS[0];
  if (tramo.tarifa === 0) return 0;
  const impuesto = (baseUvt - tramo.restarUvt) * tramo.tarifa * valorUvt + tramo.base * valorUvt;
  return redondearMiles(impuesto);
}
