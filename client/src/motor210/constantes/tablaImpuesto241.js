import { redondearMiles } from '../redondeo.js';

// Tabla progresiva del Art. 241 ET (impuesto sobre la renta cédula
// general/pensiones/dividendos). Confirmado idéntica en las hojas TABLAS y
// TABLAS2023 del .xlsm de referencia — estable entre AG2023 y AG2024, sin
// cambios de ley conocidos para AG2025 (ver docs/reglas-tributarias-AG2025.md §1).
const TRAMOS = [
  { desde: 0, hasta: 1090, tarifa: 0, base: 0, restarUvt: 0 },
  { desde: 1090, hasta: 1700, tarifa: 0.19, base: 0, restarUvt: 1090 },
  { desde: 1700, hasta: 4100, tarifa: 0.28, base: 116, restarUvt: 1700 },
  { desde: 4100, hasta: 8670, tarifa: 0.33, base: 788, restarUvt: 4100 },
  { desde: 8670, hasta: 18970, tarifa: 0.35, base: 2296, restarUvt: 8670 },
  { desde: 18970, hasta: 31000, tarifa: 0.37, base: 5901, restarUvt: 18970 },
  { desde: 31000, hasta: Infinity, tarifa: 0.39, base: 10352, restarUvt: 31000 },
];

/**
 * Variante con el desglose completo — para la pestaña de Impuesto
 * (PasoImpuesto.jsx), que necesita mostrar cuál tramo aplicó y la tarifa
 * marginal, no solo el resultado final.
 * @param {number} baseGravableEnPesos Renta líquida gravable en pesos.
 * @param {number} valorUvt UVT del año gravable.
 */
export function detalleImpuestoArt241(baseGravableEnPesos, valorUvt) {
  const baseUvt = baseGravableEnPesos / valorUvt;
  const indiceTramo = TRAMOS.findIndex((t) => baseUvt > t.desde && baseUvt <= t.hasta);
  const tramo = indiceTramo === -1 ? TRAMOS[0] : TRAMOS[indiceTramo];
  const impuesto = tramo.tarifa === 0 ? 0 : redondearMiles((baseUvt - tramo.restarUvt) * tramo.tarifa * valorUvt + tramo.base * valorUvt);

  return {
    baseUvt,
    tramos: TRAMOS,
    indiceTramoAplicado: indiceTramo === -1 ? 0 : indiceTramo,
    tarifaMarginal: tramo.tarifa,
    impuesto,
  };
}

/**
 * @param {number} baseGravableEnPesos Renta líquida gravable en pesos.
 * @param {number} valorUvt UVT del año gravable.
 * @returns {number} Impuesto en pesos, redondeado a la unidad de mil.
 */
export function impuestoArt241(baseGravableEnPesos, valorUvt) {
  return detalleImpuestoArt241(baseGravableEnPesos, valorUvt).impuesto;
}
