// Tope combinado Art. 336 ET (1.340 UVT) — ver docs/reglas-tributarias-AG2025.md
// §2.5. CORREGIDO contra el .xlsm: la hoja vestigial RESUMEN C.GENERAL decía
// 5.040 UVT; la hoja realmente usada (CED.1 GENERAL) y el texto vigente del
// Art. 336 ET confirman 1.340 UVT — ver §2bis.
import { noNegativo, redondearMiles } from './redondeo.js';

const TOPE_UVT = 1340;

/**
 * @param {{ingresosBrutos:number, incrngo:number, devolucionesRebajas?:number,
 *   rentasExentasNoLimitadas:number, baseExentasYDeduccionesLimitadas:number}[]} cedulas
 *   Las 4 cédulas en orden: [trabajo, honorariosServicios, capital, noLaboral].
 *   Cédulas fuera de alcance esta temporada se pasan en 0.
 * @param {number} uvt
 * @returns {{limitadaPorCedula:number[], techoDefinitivo:number, advertencias:string[]}}
 */
export function aplicarTopeCombinado(cedulas, uvt) {
  const advertencias = [];
  const totalIngresosBrutos = cedulas.reduce((s, c) => s + c.ingresosBrutos, 0);
  const totalIncrngo = cedulas.reduce((s, c) => s + c.incrngo, 0);
  const totalRentasExentasNoLimitadas = cedulas.reduce((s, c) => s + c.rentasExentasNoLimitadas, 0);

  // Desde AG2023 la base del límite NO resta las rentas exentas no
  // limitadas (cambio de criterio DIAN, ver docs §4 fuente actualicese.com).
  // Tampoco resta devoluciones/rebajas — confirmado en CED.1 GENERAL!E210-
  // E218 (Total ingresos brutos - INCRNGO de las 4 cédulas, la cadena
  // E206-E218 nunca toca la fila de devoluciones de no laboral); las
  // devoluciones solo afectan la renta líquida de esa cédula (K113), no
  // esta base del tope combinado.
  const baseLimite40 = totalIngresosBrutos - totalIncrngo;
  const montoA = baseLimite40 * 0.4;
  const montoB = TOPE_UVT * uvt;
  const techoLimitado = Math.min(montoA, montoB);
  if (montoB < montoA) {
    advertencias.push(`Tope de 1.340 UVT (${redondearMiles(montoB)}) alcanzado — limita el 40% calculado (${redondearMiles(montoA)}).`);
  }
  const techoDefinitivo = techoLimitado + totalRentasExentasNoLimitadas;

  // Cascada: se distribuye el techo entre las cédulas en orden fijo
  // (trabajo → honorarios → capital → no laboral), igual que CED.1 GENERAL.
  let restante = techoDefinitivo;
  const limitadaPorCedula = cedulas.map((c) => {
    const asignado = Math.min(restante, c.baseExentasYDeduccionesLimitadas);
    restante = noNegativo(restante - asignado);
    return asignado;
  });

  return { limitadaPorCedula, techoDefinitivo, advertencias };
}
