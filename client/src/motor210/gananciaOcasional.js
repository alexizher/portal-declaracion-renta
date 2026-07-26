// Ganancia ocasional — replica la hoja GANANCIA OCASIONAL. NO es parte de
// la "cédula general" (Art. 299 y ss. ET): base y tarifa propias, no pasa
// por la tabla Art. 241 ET. Captura totales digitados directamente (sin el
// sub-flujo "venta de activos fijos/acciones" con costo por activo — eso
// sigue fuera de alcance, ver docs/reglas-tributarias-AG2025.md).
import { noNegativo, redondearMiles } from './redondeo.js';

const TOPE_VIVIENDA_CAUSANTE_UVT = 13000;
const TOPE_INMUEBLE_CAUSANTE_UVT = 6500;
const TOPE_HERENCIA_LEGADO_UVT = 3250;
const TOPE_PORCION_CONYUGAL_UVT = 3250;
const TOPE_BIENES_TERCEROS_UVT = 1625;
const TOPE_DONACIONES_UVT = 1625;
const TOPE_VENTA_CASA_HABITUAL_UVT = 5000;
const TOPE_SEGUROS_VIDA_UVT = 3250;

const TARIFA_GENERAL = 0.15;
const TARIFA_LOTERIAS = 0.2;

/**
 * @param {object} input
 * @param {object} input.ingresos ventaActivosFijos2AniosOMas,
 *   ventaAcciones2AniosOMas, porcionConyugal, liquidacionSociedades,
 *   herencia, legados, indemnizacionSegurosVida, donacionesInterVivos
 *   (GANANCIA OCASIONAL filas 10-17, tarifa 15%).
 * @param {number} input.loteriasRifas Filas 20-26, tarifa 20% (sobre el
 *   valor bruto, sin costos ni exenciones).
 * @param {number} input.gananciasExterior Filas 28-33, tarifa 15%.
 * @param {object} input.costos costoVentaActivosFijos, costoVentaAcciones
 *   (filas 35-41).
 * @param {object} input.exentas Filas 43-58 — algunas se derivan de los
 *   ingresos ya digitados (porción conyugal, donaciones, seguros de vida);
 *   el resto se digita aparte porque depende de sub-flujos fuera de alcance
 *   (venta de activos/acciones) o del juicio del preparador:
 *   ventaCasaAntes1987, viviendaCausante, inmuebleCausante, herenciaLegado,
 *   bienesTerceros, librosRopaMobiliario, ventaCasaHabitual, accionesBVC,
 *   exteriorEce, otras.
 * @param {object} ctx
 * @param {number} ctx.uvt
 */
export function calcularGananciaOcasional(input, ctx) {
  const { uvt } = ctx;
  const ing = input.ingresos;
  const ex = input.exentas;
  const advertencias = [];

  const ingresosActivosYDemas =
    ing.ventaActivosFijos2AniosOMas +
    ing.ventaAcciones2AniosOMas +
    ing.porcionConyugal +
    ing.liquidacionSociedades +
    ing.herencia +
    ing.legados +
    ing.indemnizacionSegurosVida +
    ing.donacionesInterVivos;

  const ingresosLoteriasRifas = input.loteriasRifas;
  const ingresosExterior = input.gananciasExterior;
  const ingresosTotales = ingresosActivosYDemas + ingresosLoteriasRifas + ingresosExterior;

  const costosTotales = input.costos.costoVentaActivosFijos + input.costos.costoVentaAcciones;

  // Exentas derivadas del ingreso ya digitado (mismo campo fuente que el
  // .xlsm de referencia enlaza por fórmula, ej. fila 50 = +C12).
  const exentaPorcionConyugal = Math.min(ing.porcionConyugal, TOPE_PORCION_CONYUGAL_UVT * uvt);
  const exentaDonaciones = Math.min(ing.donacionesInterVivos * 0.2, TOPE_DONACIONES_UVT * uvt);
  const exentaSegurosVida = Math.min(ing.indemnizacionSegurosVida, TOPE_SEGUROS_VIDA_UVT * uvt);

  // Exentas digitadas aparte (dependen de sub-flujos fuera de alcance o del
  // juicio del preparador, no de un ingreso capturado arriba).
  const exentaVentaCasaAntes1987 = ex.ventaCasaAntes1987;
  const exentaViviendaCausante = Math.min(ex.viviendaCausante, TOPE_VIVIENDA_CAUSANTE_UVT * uvt);
  const exentaInmuebleCausante = Math.min(ex.inmuebleCausante, TOPE_INMUEBLE_CAUSANTE_UVT * uvt);
  const exentaHerenciaLegado = Math.min(ex.herenciaLegado, TOPE_HERENCIA_LEGADO_UVT * uvt);
  const exentaBienesTerceros = Math.min(ex.bienesTerceros, TOPE_BIENES_TERCEROS_UVT * uvt);
  const exentaLibrosRopaMobiliario = ex.librosRopaMobiliario;
  const exentaVentaCasaHabitual = Math.min(ex.ventaCasaHabitual, TOPE_VENTA_CASA_HABITUAL_UVT * uvt);
  const exentaAccionesBVC = ex.accionesBVC;
  const exentaExteriorEce = ex.exteriorEce;
  const exentaOtras = ex.otras;

  const exentasTotales =
    exentaVentaCasaAntes1987 +
    exentaViviendaCausante +
    exentaInmuebleCausante +
    exentaHerenciaLegado +
    exentaPorcionConyugal +
    exentaBienesTerceros +
    exentaDonaciones +
    exentaLibrosRopaMobiliario +
    exentaVentaCasaHabitual +
    exentaAccionesBVC +
    exentaExteriorEce +
    exentaSegurosVida +
    exentaOtras;

  // Techo: costos y exenciones no pueden superar el total de ingresos por
  // ganancia ocasional (GANANCIA OCASIONAL!C66/C67).
  const costosAplicados = Math.min(costosTotales, ingresosTotales);
  const exentasAplicadas = Math.min(exentasTotales, ingresosTotales);

  // Casilla informativa "Ganancia Ocasional gravable" — escenario 1 (el
  // único aplicable en este alcance: sin deudores Ley 1116 ni pérdidas
  // fiscales acumuladas, filas 64-65 en 0). NO es la base real del
  // impuesto: las loterías se gravan sobre su valor bruto, ver abajo.
  const gananciaOcasionalGravable = noNegativo(ingresosTotales - costosAplicados - exentasAplicadas);

  // Impuesto — dos tarifas independientes (GANANCIA OCASIONAL!C71-C74):
  // 20% sobre loterías/rifas (bruto, sin costos ni exenciones) + 15% sobre
  // (activos/demás + exterior) neto de costos y exenciones. Los costos y
  // exenciones NO reducen la base de loterías, aunque si sobran después de
  // aplicarse a la base del 15% no se trasladan (mismo comportamiento del
  // .xlsm de referencia).
  const baseTarifa15 = noNegativo(ingresosActivosYDemas + ingresosExterior - costosAplicados - exentasAplicadas);
  const impuestoTarifa15 = baseTarifa15 * TARIFA_GENERAL;
  const impuestoTarifa20 = ingresosLoteriasRifas * TARIFA_LOTERIAS;
  const impuestoGananciaOcasional = redondearMiles(impuestoTarifa15 + impuestoTarifa20);

  return {
    ingresosTotales,
    costosAplicados,
    exentasAplicadas,
    gananciaOcasionalGravable,
    impuestoGananciaOcasional,
    advertencias,
  };
}
