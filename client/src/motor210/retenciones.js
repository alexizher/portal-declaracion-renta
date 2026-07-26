import { redondearMiles } from './redondeo.js';

/**
 * @param {{retencion:number}[]} filas Tabla de retenciones practicadas
 *   (agente retenedor, NIT, concepto, base, retención) — se digita a mano
 *   leyendo los certificados de retención del cliente.
 */
export function totalRetenciones(filas) {
  return redondearMiles(filas.reduce((s, f) => s + (f.retencion || 0), 0));
}
