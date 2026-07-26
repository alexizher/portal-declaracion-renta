// Cédula de dividendos y participaciones — replica CED.3 DIVIDENDOS. Solo
// calcula las 4 rentas líquidas cedulares (por bloque); el tratamiento
// tributario especial de la Subcédula 2 (tarifa del 35% + descuento Art.
// 254-1 ET) vive en impuestoDividendos.js, porque es cálculo de IMPUESTO,
// no de renta líquida — ver docs/reglas-tributarias-AG2025.md.
import { noNegativo } from '../redondeo.js';

/**
 * @param {object} input
 * @param {object} input.anio2016yAnteriores dividendosNoGravados,
 *   dividendosGravados, capitalizacionesNoGravadas, capitalizacionesGravadas,
 *   distribucionEceNoGravados, distribucionEceGravados.
 * @param {number} input.subcedula1NoGravados Dividendos 2017+ numeral 3 art.
 *   49 ET — ya "no gravados" (profits que pagaron impuesto de renta en la
 *   sociedad), sin límite.
 * @param {number} input.subcedula2Gravados Dividendos 2017+ parágrafo 2 art.
 *   49 ET — "gravados" (utilidades que NO pagaron impuesto pleno en la
 *   sociedad), tarifa especial del 35% en impuestoDividendos.js.
 * @param {number} input.rentaLiquidaPasivaExterior Dividendos ECE y/o
 *   recibidos del exterior y/o países CAN.
 * @param {number} input.rentaExentaExterior Rentas exentas asociadas a esos
 *   dividendos del exterior.
 */
export function calcularCedulaDividendos(input) {
  const a16 = input.anio2016yAnteriores;

  const total2016 = a16.dividendosNoGravados + a16.dividendosGravados + a16.capitalizacionesNoGravadas + a16.capitalizacionesGravadas + a16.distribucionEceNoGravados + a16.distribucionEceGravados;
  const incrngo2016 = a16.dividendosNoGravados + a16.capitalizacionesNoGravadas + a16.distribucionEceNoGravados;
  const rentaLiquida2016 = noNegativo(total2016 - incrngo2016);

  const rentaLiquidaSubcedula1 = input.subcedula1NoGravados;
  const rentaLiquidaSubcedula2 = input.subcedula2Gravados;
  const rentaLiquidaExterior = noNegativo(input.rentaLiquidaPasivaExterior - input.rentaExentaExterior);

  const rentaLiquidaGravableTotal = rentaLiquida2016 + rentaLiquidaSubcedula1 + rentaLiquidaSubcedula2 + rentaLiquidaExterior;

  return {
    // Casillas 104-105 (bruto/INCRNGO 2016) — se exponen sin redondear,
    // igual que el resto de los módulos de cédula (se redondea al ensamblar
    // en formulario210.js).
    total2016,
    incrngo2016,
    rentaLiquida2016,
    rentaLiquidaSubcedula1,
    rentaLiquidaSubcedula2,
    // Casillas 109-110 (bruto/exenta del exterior, antes de netear).
    rentaLiquidaPasivaExterior: input.rentaLiquidaPasivaExterior,
    rentaExentaExterior: input.rentaExentaExterior,
    rentaLiquidaExterior,
    rentaLiquidaGravableTotal,
    advertencias: [],
  };
}
