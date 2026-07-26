// Anticipo de renta — Art. 807 ET. Dos métodos, se declara el MENOR (más
// beneficioso para el contribuyente) — ver docs/reglas-tributarias-AG2025.md §.
import { noNegativo, redondearMiles } from './redondeo.js';

const TARIFA_POR_ANTIGUEDAD = {
  primerAnio: 0, // no aplica anticipo el primer año (Art. 807 par. 1 ET)
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
  if (antiguedadDeclarante === 'primerAnio') {
    return { anticipo: 0, metodoUsado: null, nota: 'No aplica anticipo por ser el primer año como declarante.' };
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
