// Cédula de rentas no laborales — replica CED.1 GENERAL (columnas J/K) y
// las categorías de ingreso confirmadas en la hoja RENTAS NO LABORAL
// (ver docs/reglas-tributarias-AG2025.md §2.4).
import { noNegativo } from '../redondeo.js';

function sumarValores(objeto) {
  return Object.values(objeto || {}).reduce((s, v) => s + (v || 0), 0);
}

/**
 * @param {object} input
 * @param {object} input.ingresos honorarios2omastrabajadores,
 *   compensacionServicios2omastrabajadores,
 *   ventasMercancia, ventasActividades,
 *   ventasInventarios, ventasActivosBiologicos, construccion,
 *   apoyosEducativos, gananciales, indemnizacionDanoEmergente,
 *   indemnizacionLucroCesante, indemnizacionSegurosDistintosVida,
 *   retiroPensionSinPermanencia, retiroAfcSinPermanencia,
 *   ventaInmuebles, ventaInversiones, ventaActivosFijos,
 *   colaboracionEmpresarial, ingresosCAN, ingresosExterior, otros.
 * @param {object} input.incrngo saludObligatoria, pensionObligatoria,
 *   fondoSolidaridadPensional, aportesARL, aportesVoluntariosRAIS,
 *   apoyosEducativos, colciencias, danoEmergente, aportesARLIndependientes,
 *   otros — mismo set que trabajo (CED.1 GENERAL!J70-J86).
 * @param {number} input.devolucionesRebajas
 * @param {number} input.costosYGastos
 * @param {object} input.rentasExentasLimitadas CED.1 GENERAL!J122-J125.
 * @param {object} input.rentasExentasNoLimitadas CED.1 GENERAL!J134/J136.
 * @param {number} input.afcPensionVoluntaria
 * @param {number} input.viviendaDigitado
 * @param {number} input.icetexDigitado
 * @param {number} input.gmfCertificado Se deduce el 50% (J148).
 * @param {number} input.cesantiasParticipesIndependientes Tope: 1/12 de la
 *   renta líquida de esta cédula, o 2.500 UVT (J150).
 * @param {number} input.autoHibrido Se deduce el 50% (J151).
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

  const inc = input.incrngo || {};
  const raisLimitado = Math.min(inc.aportesVoluntariosRAIS || 0, ingresosBrutos * 0.25, 2500 * uvt);
  const incrngo =
    (inc.saludObligatoria || 0) +
    (inc.pensionObligatoria || 0) +
    (inc.fondoSolidaridadPensional || 0) +
    (inc.aportesARL || 0) +
    raisLimitado +
    (inc.apoyosEducativos || 0) +
    (inc.colciencias || 0) +
    (inc.danoEmergente || 0) +
    (inc.aportesARLIndependientes || 0) +
    (inc.otros || 0);

  const rentaLiquida = noNegativo(ingresosBrutos - input.devolucionesRebajas - incrngo - input.costosYGastos);

  const viviendaLimitada = Math.min(input.viviendaDigitado, viviendaDisponible);
  const icetexLimitado = Math.min(input.icetexDigitado, icetexDisponible);
  const gmfDeducible = (input.gmfCertificado || 0) * 0.5;
  // CED.1 GENERAL!K150: MIN(digitado, renta líquida de esta cédula / 12, 2.500 UVT).
  const cesantiasParticipesLimitadas = Math.min(input.cesantiasParticipesIndependientes || 0, rentaLiquida / 12, 2500 * uvt);
  const autoHibridoDeducible = (input.autoHibrido || 0) * 0.5;
  const deduccionesImputablesSinDependientes =
    viviendaLimitada + icetexLimitado + gmfDeducible + cesantiasParticipesLimitadas + autoHibridoDeducible;

  const afcPensionLimitada = Math.min(input.afcPensionVoluntaria, ingresosBrutos * 0.3, 3800 * uvt);

  const otrasRentasExentasLimitadas = sumarValores(input.rentasExentasLimitadas);
  const otrasRentasExentasNoLimitadas = sumarValores(input.rentasExentasNoLimitadas);

  return {
    ingresosBrutos,
    incrngo,
    costosDeducciones: input.costosYGastos,
    devolucionesRebajas: input.devolucionesRebajas,
    rentaLiquida,
    deduccionesImputablesSinDependientes,
    rentasExentasNoLimitadas: otrasRentasExentasNoLimitadas,
    afcPensionLimitada,
    viviendaLimitada,
    icetexLimitado,
    baseExentasYDeduccionesLimitadas: deduccionesImputablesSinDependientes + afcPensionLimitada + otrasRentasExentasLimitadas,
    advertencias: [],
  };
}
