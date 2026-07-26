// Descuentos tributarios (Art. 254-259 ET) — simplificado a un solo campo
// "otros descuentos" para el alcance MVP (impuestos pagados en el
// exterior, donaciones, IVA activos fijos, etc. son casos raros en la
// práctica de personas naturales; ver docs/reglas-tributarias-AG2025.md).
// Límite Art. 259 ET: el descuento no puede exceder el impuesto básico.
import { noNegativo, redondearMiles } from './redondeo.js';

/**
 * @param {number} descuentosDigitados Suma de descuentos que el
 *   contribuyente tiene derecho a solicitar (exterior, donaciones, otros).
 * @param {number} impuestoBasico Casilla 121.
 */
export function calcularDescuentos(descuentosDigitados, impuestoBasico) {
  return redondearMiles(Math.min(noNegativo(descuentosDigitados), impuestoBasico));
}
