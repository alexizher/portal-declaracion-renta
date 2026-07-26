import { noNegativo, redondearMiles } from './redondeo.js';

/**
 * Impuesto neto de renta (casilla 126, Art. 254-259 ET) — resta los
 * descuentos tributarios ya aplicados (casilla 125) del total de impuesto
 * a cargo sobre las rentas líquidas gravables (casilla 121 = cédula general
 * + pensiones + dividendos, ver formulario210.js).
 * @param {number} impuestoBasico Casilla 121, ya ensamblada.
 * @param {number} descuentosAplicados Casilla 125 — ya topada a más no
 *   poder exceder `impuestoBasico` (ver descuentos.js).
 */
export function calcularImpuestoNeto(impuestoBasico, descuentosAplicados) {
  const impuestoNeto = redondearMiles(noNegativo(impuestoBasico - descuentosAplicados));
  return { impuestoNeto };
}
