// Cédula de honorarios y compensación de servicios personales — replica
// CED.1 GENERAL (columnas F/G). Aplica cuando el contribuyente RENUNCIA a
// la exención del Art. 206 núm. 10 ET para restar costos y gastos como
// independiente (Art. 107/107-1/771-2 ET).
import { noNegativo } from '../redondeo.js';

/**
 * @param {object} input
 * @param {object} input.ingresos honorarios, compensacionServicios,
 *   comisionesBonificaciones, ingresosExterior, otros.
 * @param {number} input.costosYGastos Total costos/gastos procedentes
 *   (Art. 107 ET) — se digita el total, no línea por línea (alcance MVP).
 * @param {number} input.afcPensionVoluntaria
 * @param {number} input.medicinaDigitado Antes del tope compartido con trabajo.
 * @param {number} input.viviendaDigitado Antes del tope compartido.
 * @param {number} input.icetexDigitado Antes del tope compartido.
 * @param {object} ctx
 * @param {number} ctx.uvt
 * @param {number} ctx.medicinaDisponible Tope de 192 UVT ya reducido por trabajo.
 * @param {number} ctx.viviendaDisponible Tope de 1.200 UVT ya reducido por cédulas anteriores.
 * @param {number} ctx.icetexDisponible Tope de 100 UVT ya reducido por cédulas anteriores.
 */
export function calcularCedulaHonorariosServicios(input, ctx) {
  const { uvt, medicinaDisponible, viviendaDisponible, icetexDisponible } = ctx;
  const ing = input.ingresos;

  const ingresosBrutos = ing.honorarios + ing.compensacionServicios + ing.comisionesBonificaciones + ing.ingresosExterior + ing.otros;
  const incrngo = 0; // en la práctica de esta cédula, los INCRNGO habituales (salud/pensión obligatoria) ya se dedujeron en trabajo si aplica; se deja en 0 por alcance MVP salvo que se detecte un caso real que lo requiera
  const rentaLiquida = noNegativo(ingresosBrutos - incrngo - input.costosYGastos);

  const medicinaLimitada = Math.min(input.medicinaDigitado, medicinaDisponible);
  const viviendaLimitada = Math.min(input.viviendaDigitado, viviendaDisponible);
  const icetexLimitado = Math.min(input.icetexDigitado, icetexDisponible);
  const deduccionesImputablesSinDependientes = medicinaLimitada + viviendaLimitada + icetexLimitado;

  const afcPensionLimitada = Math.min(input.afcPensionVoluntaria, ingresosBrutos * 0.3, 3800 * uvt);

  return {
    ingresosBrutos,
    incrngo,
    costosDeducciones: input.costosYGastos,
    rentaLiquida,
    deduccionesImputablesSinDependientes,
    rentasExentasNoLimitadas: 0,
    afcPensionLimitada,
    medicinaLimitada,
    viviendaLimitada,
    icetexLimitado,
    baseExentasYDeduccionesLimitadas: deduccionesImputablesSinDependientes + afcPensionLimitada,
    advertencias: [],
  };
}
