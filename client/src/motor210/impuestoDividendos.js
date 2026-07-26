// Tratamiento tributario especial de los dividendos — TABLAS filas 38-74
// del .xlsm de referencia. Reforma Ley 2277 de 2022: desde AG2023 los
// dividendos NO tienen una tarifa plana única — se dividen en 3 cálculos:
//
// 1) Dividendos 2016 y anteriores: tabla progresiva propia (tablaDividendos2016.js).
// 2) Subcédula 2 (utilidades que NO pagaron impuesto pleno en la sociedad,
//    parágrafo 2 Art. 49 ET): tarifa plana del 35%. El REMANENTE después de
//    ese 35% se sigue tratando como renta ordinaria y se suma a la cédula
//    general + pensiones + subcédula 1 para pasar por la tabla del Art. 241
//    ET (ver formulario210.js, casilla 111) — así lo hace TABLAS!G22 (=G9+G10+G13+G62).
// 2b) Dividendos ECE y/o recibidos del exterior (casillas 109-110, ya netos
//    de su renta exenta): tarifa plana del 35% (CONSOLIDADO RLC!K19), casilla
//    120 — a diferencia de la subcédula 2, el remanente NO se suma a la
//    tabla del Art. 241 ni entra al descuento Art. 254-1 (confirmado
//    CONSOLIDADO RLC!K19 = E19*35% y TABLAS!G66 no lo referencia).
// 3) Descuento tributario Art. 254-1 ET: para no gravar dos veces el mismo
//    dividendo, se resta un descuento calculado sobre subcédula 1 + el
//    remanente de subcédula 2, con una tabla de un solo tramo (0% hasta
//    1.090 UVT, 19% en adelante — TABLAS!G69-74).
import { redondearMiles, noNegativo } from './redondeo.js';
import { impuestoDividendos2016 } from './constantes/tablaDividendos2016.js';

const TARIFA_SUBCEDULA_2 = 0.35;
const TOPE_DESCUENTO_SIN_IMPUESTO_UVT = 1090;
const TARIFA_DESCUENTO = 0.19;

/**
 * @param {object} dividendos Resultado de cedulas/dividendos.js.
 * @param {number} uvt
 */
export function calcularImpuestoDividendos(dividendos, uvt) {
  const impuestoDiv2016 = impuestoDividendos2016(dividendos.rentaLiquida2016, uvt);

  const impuestoSubcedula2 = redondearMiles(dividendos.rentaLiquidaSubcedula2 * TARIFA_SUBCEDULA_2);
  const remanenteSubcedula2 = noNegativo(dividendos.rentaLiquidaSubcedula2 - impuestoSubcedula2);

  const impuestoExterior = redondearMiles(dividendos.rentaLiquidaExterior * TARIFA_SUBCEDULA_2);

  const baseDescuentoPesos = dividendos.rentaLiquidaSubcedula1 + remanenteSubcedula2;
  const baseDescuentoUvt = baseDescuentoPesos / uvt;
  const descuentoDividendos =
    baseDescuentoUvt > TOPE_DESCUENTO_SIN_IMPUESTO_UVT
      ? redondearMiles((baseDescuentoUvt - TOPE_DESCUENTO_SIN_IMPUESTO_UVT) * TARIFA_DESCUENTO * uvt)
      : 0;

  return {
    impuestoDiv2016,
    impuestoSubcedula2,
    impuestoExterior,
    // Se suma a cédula general + pensiones + subcédula 1 para la tabla Art. 241 ET.
    remanenteSubcedula2ParaArt241: remanenteSubcedula2,
    descuentoDividendos,
  };
}
