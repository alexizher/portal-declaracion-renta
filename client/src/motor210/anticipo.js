// Anticipo de renta — Art. 807 ET. Dos métodos, se declara el MENOR (más
// beneficioso para el contribuyente) — ver docs/reglas-tributarias-AG2025.md §.
import { noNegativo, redondearMiles } from './redondeo.js';

const TARIFA_POR_ANTIGUEDAD = {
  primerAnio: 0.25,
  segundoAnio: 0.5,
  terceroYSiguientes: 0.75,
};

/**
 * @param {number} impuestoNetoAnioActual Casilla 126 de esta declaración.
 * @param {number} impuestoNetoAnioAnterior Casilla 126 de la declaración anterior (entrada manual).
 * @param {number} retencionesAnioActual Casilla 132.
 * @param {'primerAnio'|'segundoAnio'|'terceroYSiguientes'} antiguedadDeclarante
 */
export function calcularAnticipo(impuestoNetoAnioActual, impuestoNetoAnioAnterior, retencionesAnioActual, antiguedadDeclarante) {
  const tarifa = TARIFA_POR_ANTIGUEDAD[antiguedadDeclarante];

  // Primer año (Art. 807 ET): el Método 1 (promedio con el año anterior)
  // NO aplica — no hay impuesto neto del año anterior como declarante — el
  // Excel de referencia le pone el texto "No aplica por ser primera vez" en
  // esa celda (ANTICIPO!F22). Pero el Método 2 SÍ sigue corriendo con la
  // tarifa del 25% (ANTICIPO!G17=G12*G15, G15=25% en primer año) y es el
  // que termina usándose (FORMULARIO 210!X59 escoge el numérico cuando el
  // otro es texto) — el anticipo del primer año NO es cero, es el 25% del
  // impuesto neto de este año menos retenciones.
  if (antiguedadDeclarante === 'primerAnio') {
    const metodo2Primero = noNegativo(impuestoNetoAnioActual * tarifa - retencionesAnioActual);
    return {
      anticipo: redondearMiles(metodo2Primero),
      metodoUsado: 2,
      metodo2: redondearMiles(metodo2Primero),
      nota: 'Primer año como declarante: el Método 1 no aplica (no hay impuesto neto del año anterior), se usa el Método 2 con tarifa del 25%.',
    };
  }

  const promedio = (impuestoNetoAnioActual + impuestoNetoAnioAnterior) / 2;
  const metodo1 = noNegativo(promedio * tarifa - retencionesAnioActual);
  const metodo2 = noNegativo(impuestoNetoAnioActual * tarifa - retencionesAnioActual);
  const anticipo = Math.min(metodo1, metodo2);

  return {
    anticipo: redondearMiles(anticipo),
    metodoUsado: metodo1 <= metodo2 ? 1 : 2,
    metodo1: redondearMiles(metodo1),
    metodo2: redondearMiles(metodo2),
  };
}
