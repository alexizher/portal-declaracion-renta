// Cédula de rentas no laborales — replica CED.1 GENERAL (columnas J/K) y
// las categorías de ingreso confirmadas en la hoja RENTAS NO LABORAL
// (ver docs/reglas-tributarias-AG2025.md §2.4).
import { noNegativo } from '../redondeo.js';

/**
 * @param {object} input
 * @param {object} input.ingresos honorarios2omastrabajadores,
 *   compensacionServicios2omastrabajadores, contratosPrestacionServicios,
 *   ventasMercancia, ventasActividades,
 *   ventasInventarios, ventasActivosBiologicos, construccion,
 *   apoyosEducativos, gananciales, indemnizacionDanoEmergente,
 *   indemnizacionLucroCesante, indemnizacionSegurosDistintosVida,
 *   retiroPensionSinPermanencia, retiroAfcSinPermanencia,
 *   ventaInmuebles, ventaInversiones, ventaActivosFijos,
 *   colaboracionEmpresarial, ingresosCAN, ingresosExterior, otros.
 * @param {number} input.devolucionesRebajas
 * @param {number} input.costosYGastos
 * @param {number} input.afcPensionVoluntaria
 * @param {number} input.viviendaDigitado
 * @param {number} input.icetexDigitado
 * @param {object} ctx
 * @param {number} ctx.uvt
 * @param {number} ctx.viviendaDisponible
 * @param {number} ctx.icetexDisponible
 */
export function calcularCedulaNoLaboral(input, ctx) {
  const { uvt, viviendaDisponible, icetexDisponible } = ctx;
  const ing = input.ingresos;

  const ingresosBrutos =
    ing.honorarios2omastrabajadores +
    ing.compensacionServicios2omastrabajadores +
    ing.contratosPrestacionServicios +
    ing.ventasMercancia +
    ing.ventasActividades +
    ing.ventasInventarios +
    ing.ventasActivosBiologicos +
    ing.construccion +
    ing.apoyosEducativos +
    ing.gananciales +
    ing.indemnizacionDanoEmergente +
    ing.indemnizacionLucroCesante +
    ing.indemnizacionSegurosDistintosVida +
    ing.retiroPensionSinPermanencia +
    ing.retiroAfcSinPermanencia +
    ing.ventaInmuebles +
    ing.ventaInversiones +
    ing.ventaActivosFijos +
    ing.colaboracionEmpresarial +
    ing.ingresosCAN +
    ing.ingresosExterior +
    ing.otros;

  const incrngo = 0; // ver nota en honorariosServicios.js — alcance MVP
  const rentaLiquida = noNegativo(ingresosBrutos - input.devolucionesRebajas - incrngo - input.costosYGastos);

  const viviendaLimitada = Math.min(input.viviendaDigitado, viviendaDisponible);
  const icetexLimitado = Math.min(input.icetexDigitado, icetexDisponible);
  const deduccionesImputablesSinDependientes = viviendaLimitada + icetexLimitado;

  const afcPensionLimitada = Math.min(input.afcPensionVoluntaria, ingresosBrutos * 0.3, 3800 * uvt);

  return {
    ingresosBrutos,
    incrngo,
    costosDeducciones: input.costosYGastos,
    devolucionesRebajas: input.devolucionesRebajas,
    rentaLiquida,
    deduccionesImputablesSinDependientes,
    rentasExentasNoLimitadas: 0,
    afcPensionLimitada,
    viviendaLimitada,
    icetexLimitado,
    baseExentasYDeduccionesLimitadas: deduccionesImputablesSinDependientes + afcPensionLimitada,
    advertencias: [],
  };
}
