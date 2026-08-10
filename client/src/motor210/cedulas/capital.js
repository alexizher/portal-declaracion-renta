// Cédula de rentas de capital — replica CED.1 GENERAL (columnas H/I).
import { noNegativo } from '../redondeo.js';

function sumarValores(objeto) {
  return Object.values(objeto || {}).reduce((s, v) => s + (v || 0), 0);
}

/**
 * @param {object} input
 * @param {object} input.ingresos intereses, interesesParticulares,
 *   descuentosTitulos, colaboracionEmpresarial, rendimientosEntidadesFinancieras,
 *   rendimientosTitulosDeudaPublica, bonosPapelesComerciales, fondosInversionColectiva,
 *   rendimientosPensiones, rendimientosCesantias, rendimientosAFC,
 *   arrendamientos, regalias, propiedadIntelectual, ingresosExterior, otros.
 * @param {object} input.costosYGastos Costos y gastos procedentes (Art.
 *   107/107-1/771-2 ET) — CED.1 GENERAL filas 89-111. La línea
 *   "gastosFinancieros" se afecta por `ctx.componenteInflacionarioGastosTasa`
 *   antes de sumarse (igual que CED.1 GENERAL!H98).
 * @param {number} input.afcPensionVoluntaria
 * @param {number} input.viviendaDigitado Antes del tope compartido.
 * @param {number} input.icetexDigitado Antes del tope compartido.
 * @param {object} ctx
 * @param {number} ctx.uvt
 * @param {number} ctx.componenteInflacionarioTasa `DATOS BÁSICOS!E28` del año (ej. 0.5088 para AG2024) — afecta los INGRESOS de esta cédula.
 * @param {number} ctx.componenteInflacionarioGastosTasa `DATOS BÁSICOS!E29` del año (ej. 0.2501 para AG2024) — afecta solo "Gastos financieros".
 * @param {number} ctx.viviendaDisponible Tope de 1.200 UVT ya reducido por cédulas anteriores.
 * @param {number} ctx.icetexDisponible Tope de 100 UVT ya reducido por cédulas anteriores.
 */
export function calcularCedulaCapital(input, ctx) {
  const { uvt, componenteInflacionarioTasa, componenteInflacionarioGastosTasa, viviendaDisponible, icetexDisponible } = ctx;
  const ing = input.ingresos;

  const ingresosBrutos =
    ing.intereses +
    ing.interesesParticulares +
    ing.descuentosTitulos +
    ing.colaboracionEmpresarial +
    ing.rendimientosEntidadesFinancieras +
    ing.rendimientosTitulosDeudaPublica +
    ing.bonosPapelesComerciales +
    ing.fondosInversionColectiva +
    ing.rendimientosPensiones +
    ing.rendimientosCesantias +
    ing.rendimientosAFC +
    ing.arrendamientos +
    ing.regalias +
    ing.propiedadIntelectual +
    ing.ingresosExterior +
    ing.otros;

  // Componente inflacionario (Art. 38/39 ET) — aplica a "intereses y
  // rendimientos financieros", entidades vigiladas, deuda pública, bonos y
  // papeles comerciales, y FIC. NO aplica a intereses entre particulares,
  // descuentos de títulos, contratos de colaboración empresarial, ni a
  // rendimientos de pensiones/cesantías/AFC (ya exentos por otra vía).
  // Confirmado en CED.1 GENERAL!H78: SUM(I28:I38)-I29-I30-I31 (I29/I30/I31
  // son justo interesesParticulares/descuentosTitulos/colaboracionEmpresarial).
  const baseComponenteInflacionario =
    ing.intereses +
    ing.rendimientosEntidadesFinancieras +
    ing.rendimientosTitulosDeudaPublica +
    ing.bonosPapelesComerciales +
    ing.fondosInversionColectiva;
  const incrngo = baseComponenteInflacionario * componenteInflacionarioTasa;

  // Costos y gastos procedentes — "gastosFinancieros" lleva su propio
  // componente inflacionario (E29), distinto del de los ingresos (E28).
  const costos = input.costosYGastos || {};
  const gastosFinancierosAjustados = (costos.gastosFinancieros || 0) * (1 - (componenteInflacionarioGastosTasa ?? 0));
  const costosDeducciones = sumarValores({ ...costos, gastosFinancieros: gastosFinancierosAjustados });

  const rentaLiquida = noNegativo(ingresosBrutos - incrngo - costosDeducciones);

  const viviendaLimitada = Math.min(input.viviendaDigitado, viviendaDisponible);
  const icetexLimitado = Math.min(input.icetexDigitado, icetexDisponible);
  const deduccionesImputablesSinDependientes = viviendaLimitada + icetexLimitado;

  const afcPensionLimitada = Math.min(input.afcPensionVoluntaria, ingresosBrutos * 0.3, 3800 * uvt);

  return {
    ingresosBrutos,
    incrngo,
    costosDeducciones,
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
