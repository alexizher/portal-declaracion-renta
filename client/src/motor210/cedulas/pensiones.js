// Cédula de pensiones — replica CED.2 PENSIONES. Tope propio de 12.000 UVT
// anuales para las rentas exentas (Art. 206 núm. 5 ET) — NO es el mismo
// tope combinado de 1.340 UVT de la cédula general (Art. 336 ET), por eso
// esta cédula NO entra al arreglo `cedulas` de exencionesDeducciones.js.
import { noNegativo } from '../redondeo.js';

const TOPE_RENTA_EXENTA_UVT = 12000;

/**
 * @param {object} input
 * @param {object} input.ingresos jubilacion, invalidez, vejez, sobrevivientes,
 *   riesgosProfesionales, indemnizacionesSustitutivas, devolucionSaldosAhorro
 *   — ingresos de pensión del país (CED.2 PENSIONES filas 16-22).
 * @param {object} input.ingresosExterior Filas 26-34: 3 categorías con
 *   trato distinto para la exención — sinConvenioJubilacionEtc/sinConvenioOtras
 *   (SIN exención, no hay convenio para evitar doble imposición),
 *   demasPaisesJubilacionEtc/demasPaisesOtras (exentas, tope 12.000 UVT),
 *   canJubilacionEtc/canOtras (exentas SIN límite, países de la CAN).
 * @param {object} input.incrngo saludObligatoria, fondoSolidaridadPensional,
 *   indemnizaciones, otros — todos sin límite (CED.2 PENSIONES filas 40-44).
 * @param {number} input.afcPensionVoluntaria Aportes voluntarios AFC/FVP/AVC
 *   (Art. 126-1/126-4 ET) — tope 30% de la pensión del país / 3.800 UVT.
 * @param {object} ctx
 * @param {number} ctx.uvt
 */
export function calcularCedulaPensiones(input, ctx) {
  const { uvt } = ctx;
  const ing = input.ingresos;
  const ext = input.ingresosExterior;
  const inc = input.incrngo;

  const ingresosPais =
    ing.jubilacion +
    ing.invalidez +
    ing.vejez +
    ing.sobrevivientes +
    ing.riesgosProfesionales +
    ing.indemnizacionesSustitutivas +
    ing.devolucionSaldosAhorro;

  // "Sin convenios para evitar la doble imposición" entra a los ingresos
  // brutos pero NO tiene ninguna renta exenta asociada — confirmado en
  // CED.2 PENSIONES: ni la fila 50 (país) ni la 51 (CAN) ni la 52
  // (fuente extranjera, =I30+I31) referencian las filas 27-28.
  const ingresosExteriorSinExencion = ext.sinConvenioJubilacionEtc + ext.sinConvenioOtras;
  const ingresosExteriorConExencionLimitada = ext.demasPaisesJubilacionEtc + ext.demasPaisesOtras;
  const ingresosExteriorCAN = ext.canJubilacionEtc + ext.canOtras;

  const ingresosBrutos = ingresosPais + ingresosExteriorSinExencion + ingresosExteriorConExencionLimitada + ingresosExteriorCAN;

  const incrngo = inc.saludObligatoria + inc.fondoSolidaridadPensional + inc.indemnizaciones + inc.otros;

  const rentaLiquida = noNegativo(ingresosBrutos - incrngo);

  const pensionesExentasPais = Math.min(
    noNegativo(ingresosPais - inc.saludObligatoria - inc.fondoSolidaridadPensional),
    TOPE_RENTA_EXENTA_UVT * uvt
  );
  const pensionesExentasCAN = ingresosExteriorCAN; // Art. 206 núm. 5 ET — sin límite para países de la CAN.
  const pensionesExentasExterior = Math.min(ingresosExteriorConExencionLimitada, TOPE_RENTA_EXENTA_UVT * uvt);
  const afcPensionLimitada = Math.min(input.afcPensionVoluntaria, ingresosPais * 0.3, 3800 * uvt);

  const totalRentasExentas = pensionesExentasPais + pensionesExentasCAN + pensionesExentasExterior + afcPensionLimitada;

  const rentaLiquidaGravable = noNegativo(rentaLiquida - totalRentasExentas);

  return {
    ingresosBrutos,
    incrngo,
    rentaLiquida,
    pensionesExentasPais,
    pensionesExentasCAN,
    pensionesExentasExterior,
    afcPensionLimitada,
    totalRentasExentas,
    rentaLiquidaGravable,
    advertencias: [],
  };
}
