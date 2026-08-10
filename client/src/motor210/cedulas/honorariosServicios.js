// Cédula de honorarios y compensación de servicios personales — replica
// CED.1 GENERAL (columnas F/G). Aplica cuando el contribuyente RENUNCIA a
// la exención del Art. 206 núm. 10 ET para restar costos y gastos como
// independiente (Art. 107/107-1/771-2 ET).
import { noNegativo } from '../redondeo.js';

function sumarValores(objeto) {
  return Object.values(objeto || {}).reduce((s, v) => s + (v || 0), 0);
}

/**
 * @param {object} input
 * @param {object} input.ingresos honorarios, compensacionServicios,
 *   comisionesBonificaciones, ingresosExterior.
 * @param {object} input.incrngo saludObligatoria, pensionObligatoria,
 *   fondoSolidaridadPensional, aportesARL, aportesVoluntariosRAIS,
 *   apoyosEducativos, colciencias, danoEmergente, aportesARLIndependientes,
 *   otros — mismo set que trabajo (CED.1 GENERAL!F70-F86).
 * @param {number} input.costosYGastos Total costos/gastos procedentes
 *   (Art. 107 ET) — se digita el total, no línea por línea (alcance MVP).
 * @param {object} input.rentasExentasLimitadas CED.1 GENERAL!F118-F125.
 * @param {object} input.rentasExentasNoLimitadas CED.1 GENERAL!F134/F136.
 * @param {number} input.afcPensionVoluntaria
 * @param {number} input.medicinaDigitado Antes del tope compartido con trabajo.
 * @param {number} input.viviendaDigitado Antes del tope compartido.
 * @param {number} input.icetexDigitado Antes del tope compartido.
 * @param {number} input.gmfCertificado Se deduce el 50% (F148).
 * @param {number} input.cesantiasParticipesIndependientes Tope: 1/12 de la
 *   renta líquida de esta cédula, o 2.500 UVT (F150).
 * @param {number} input.autoHibrido Se deduce el 50% (F151).
 * @param {object} ctx
 * @param {number} ctx.uvt
 * @param {number} ctx.medicinaDisponible Tope de 192 UVT ya reducido por trabajo.
 * @param {number} ctx.viviendaDisponible Tope de 1.200 UVT ya reducido por cédulas anteriores.
 * @param {number} ctx.icetexDisponible Tope de 100 UVT ya reducido por cédulas anteriores.
 */
export function calcularCedulaHonorariosServicios(input, ctx) {
  const { uvt, medicinaDisponible, viviendaDisponible, icetexDisponible } = ctx;
  const ing = input.ingresos;

  const ingresosBrutos = ing.honorarios + ing.compensacionServicios + ing.comisionesBonificaciones + ing.ingresosExterior;

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

  const rentaLiquida = noNegativo(ingresosBrutos - incrngo - input.costosYGastos);

  const medicinaLimitada = Math.min(input.medicinaDigitado, medicinaDisponible);
  const viviendaLimitada = Math.min(input.viviendaDigitado, viviendaDisponible);
  const icetexLimitado = Math.min(input.icetexDigitado, icetexDisponible);
  const gmfDeducible = (input.gmfCertificado || 0) * 0.5;
  // CED.1 GENERAL!G150: MIN(digitado, renta líquida de esta cédula / 12, 2.500 UVT).
  const cesantiasParticipesLimitadas = Math.min(input.cesantiasParticipesIndependientes || 0, rentaLiquida / 12, 2500 * uvt);
  const autoHibridoDeducible = (input.autoHibrido || 0) * 0.5;
  const deduccionesImputablesSinDependientes =
    medicinaLimitada + viviendaLimitada + icetexLimitado + gmfDeducible + cesantiasParticipesLimitadas + autoHibridoDeducible;

  const afcPensionLimitada = Math.min(input.afcPensionVoluntaria, ingresosBrutos * 0.3, 3800 * uvt);

  const otrasRentasExentasLimitadas = sumarValores(input.rentasExentasLimitadas);
  const otrasRentasExentasNoLimitadas = sumarValores(input.rentasExentasNoLimitadas);

  return {
    ingresosBrutos,
    incrngo,
    costosDeducciones: input.costosYGastos,
    rentaLiquida,
    deduccionesImputablesSinDependientes,
    rentasExentasNoLimitadas: otrasRentasExentasNoLimitadas,
    afcPensionLimitada,
    medicinaLimitada,
    viviendaLimitada,
    icetexLimitado,
    baseExentasYDeduccionesLimitadas: deduccionesImputablesSinDependientes + afcPensionLimitada + otrasRentasExentasLimitadas,
    advertencias: [],
  };
}
