// Ensambla el resultado de todos los módulos en las casillas del
// Formulario 210 — ver docs/reglas-tributarias-AG2025.md §7 para el mapa
// completo casilla por casilla y qué queda en 0 por estar fuera de alcance
// esta temporada (pensiones, dividendos, ganancias ocasionales, etc.).
import { noNegativo, redondearMiles } from './redondeo.js';
import { calcularDigitoVerificacion } from './identificacion.js';
import { aplicarTopeCombinado } from './exencionesDeducciones.js';
import { adicionDependientesArt336 } from './dependientes.js';
import { calcularImpuestoNeto } from './impuesto.js';
import { calcularDescuentos } from './descuentos.js';
import { calcularAnticipo } from './anticipo.js';
import { calcularImpuestoDividendos } from './impuestoDividendos.js';
import { impuestoArt241 } from './constantes/tablaImpuesto241.js';

/**
 * @param {object} entrada
 * @param {object} [entrada.cliente] Datos de identificación (casillas 5-27)
 *   capturados en el paso "Cliente" del wizard — ver estadoInicial.js.
 * @param {number} [entrada.anioGravable] Casilla 1.
 * @param {object[]} entrada.cedulas [trabajo, honorariosServicios, capital,
 *   noLaboral] — cada una ya calculada por su módulo (cedulas/trabajo.js,
 *   etc.). Cédulas no implementadas aún se pasan con todos los campos en 0.
 * @param {object} entrada.pensiones Resultado de cedulas/pensiones.js (casillas 99-103).
 * @param {object} entrada.dividendos Resultado de cedulas/dividendos.js (casillas 104-110).
 * @param {object} entrada.gananciaOcasional Resultado de gananciaOcasional.js (casillas 112-115, 127).
 * @param {number} entrada.uvt
 * @param {number} entrada.numeroDependientesArt336
 * @param {number} entrada.comprasConFacturaElectronica Casilla 28 — 1% con tope 240 UVT.
 * @param {{patrimonioBruto:number, deudas:number, patrimonioLiquido:number}} entrada.patrimonio
 * @param {number} entrada.patrimonioLiquidoAnioAnterior
 * @param {number} entrada.impuestosYAnticiposPagadosAnioGravable
 * @param {number} entrada.rentaPorComparacionPatrimonialManual Si Daniela
 *   confirma incluir el hallazgo de comparación patrimonial (casilla 96);
 *   0 si aún no se ha revisado con el cliente.
 * @param {number} entrada.descuentosTributariosDigitados
 * @param {number} entrada.retencionesPracticadas
 * @param {number} entrada.impuestoNetoAnioAnterior Casilla 126 año anterior.
 * @param {number} entrada.anticipoAnioAnterior Casilla 133 año anterior → esta casilla 130.
 * @param {number} entrada.saldoAFavorAnioAnteriorSinSolicitud Casilla 131.
 * @param {'primerAnio'|'segundoAnio'|'terceroYSiguientes'} entrada.antiguedadDeclarante
 * @param {number} [entrada.sanciones] Casilla 135, opcional.
 */
export function calcularFormulario210(entrada) {
  const { uvt, cedulas, pensiones, dividendos, gananciaOcasional } = entrada;
  const advertencias = [];

  const tope = aplicarTopeCombinado(cedulas, uvt);
  advertencias.push(...tope.advertencias);

  const rentaLiquidaPorCedula = cedulas.map((c, i) =>
    noNegativo(c.ingresosBrutos - c.incrngo - (c.costosDeducciones || 0) - (c.devolucionesRebajas || 0) - tope.limitadaPorCedula[i])
  );

  // Desglose casilla por casilla de cada cédula (32-90) — se deriva de los
  // subcomponentes que ya expone cada módulo (afcPensionLimitada,
  // viviendaLimitada, etc.) para que el Excel con formato DIAN
  // (formularioDianExcel.js) pueda mostrar la grilla completa, no solo los
  // totales. "Otras rentas exentas"/"otras deducciones" son el residuo
  // (lo que no es AFC ni vivienda) — sigue sumando exacto al total de la
  // cédula porque se calcula por resta, no por una lista aparte.
  const OFFSETS_CASILLA = [
    { ingresos: 32, incrngo: 33, rentaLiquida: 34, afc: 35, otrasExentas: 36, totalExentas: 37, vivienda: 38, otrasDeducciones: 39, totalDeducciones: 40, limitada: 41, rentaOrdinaria: 42 },
    { ingresos: 43, incrngo: 44, costos: 45, rentaLiquida: 46, afc: 47, otrasExentas: 48, totalExentas: 49, vivienda: 50, otrasDeducciones: 51, totalDeducciones: 52, limitada: 53, rentaOrdinariaEjercicio: 54, perdida: 55, compensacion: 56, rentaOrdinaria: 57 },
    { ingresos: 58, incrngo: 59, costos: 60, rentaLiquida: 61, ecePasivas: 62, afc: 63, otrasExentas: 64, totalExentas: 65, vivienda: 66, otrasDeducciones: 67, totalDeducciones: 68, limitada: 69, rentaOrdinariaEjercicio: 70, perdida: 71, compensacion: 72, rentaOrdinaria: 73 },
    { ingresos: 74, devoluciones: 75, incrngo: 76, costos: 77, rentaLiquida: 78, ecePasivas: 79, afc: 80, otrasExentas: 81, totalExentas: 82, vivienda: 83, otrasDeducciones: 84, totalDeducciones: 85, limitada: 86, rentaOrdinariaEjercicio: 87, perdida: 88, compensacion: 89, rentaOrdinaria: 90 },
  ];

  // Renta líquida floreada en 0 por cédula ANTES de sumar — CED.1
  // GENERAL!E23/G113/I113/K113 aplican el IF(...>0,...,0) por cédula, no
  // sobre la suma total (ver casilla91 más abajo).
  const rentaLiquidaCedulas = cedulas.map((c) =>
    noNegativo(c.ingresosBrutos - c.incrngo - (c.costosDeducciones || 0) - (c.devolucionesRebajas || 0))
  );

  const casillasPorCedula = {};
  cedulas.forEach((c, i) => {
    const off = OFFSETS_CASILLA[i];
    const afc = c.afcPensionLimitada || 0;
    const vivienda = c.viviendaLimitada || 0;
    const deduccionesTotal = c.deduccionesImputablesSinDependientes || 0;
    const exentasTotal = c.baseExentasYDeduccionesLimitadas || 0;
    const otrasExentas = noNegativo(exentasTotal - afc - deduccionesTotal);
    const otrasDeducciones = noNegativo(deduccionesTotal - vivienda);
    const rentaLiquidaCedula = rentaLiquidaCedulas[i];

    // Los módulos de cédula devuelven cifras SIN redondear a propósito
    // (ver cedulas/trabajo.js) — se redondea acá, al ensamblar la casilla,
    // igual que el resto de este archivo.
    casillasPorCedula[off.ingresos] = redondearMiles(c.ingresosBrutos);
    if (off.devoluciones) casillasPorCedula[off.devoluciones] = redondearMiles(c.devolucionesRebajas || 0);
    casillasPorCedula[off.incrngo] = redondearMiles(c.incrngo);
    if (off.costos) casillasPorCedula[off.costos] = redondearMiles(c.costosDeducciones || 0);
    casillasPorCedula[off.rentaLiquida] = redondearMiles(rentaLiquidaCedula);
    if (off.ecePasivas) casillasPorCedula[off.ecePasivas] = 0; // ECE fuera de alcance MVP
    casillasPorCedula[off.afc] = redondearMiles(afc);
    casillasPorCedula[off.otrasExentas] = redondearMiles(otrasExentas);
    casillasPorCedula[off.totalExentas] = redondearMiles(afc + otrasExentas);
    casillasPorCedula[off.vivienda] = redondearMiles(vivienda);
    casillasPorCedula[off.otrasDeducciones] = redondearMiles(otrasDeducciones);
    casillasPorCedula[off.totalDeducciones] = redondearMiles(vivienda + otrasDeducciones);
    casillasPorCedula[off.limitada] = redondearMiles(tope.limitadaPorCedula[i]);
    if (off.rentaOrdinariaEjercicio) casillasPorCedula[off.rentaOrdinariaEjercicio] = redondearMiles(rentaLiquidaPorCedula[i]);
    if (off.perdida) casillasPorCedula[off.perdida] = 0; // sin pérdidas en alcance MVP
    if (off.compensacion) casillasPorCedula[off.compensacion] = 0;
    casillasPorCedula[off.rentaOrdinaria] = redondearMiles(rentaLiquidaPorCedula[i]);
  });

  // Casilla 91: renta líquida cédula general = suma de renta líquida
  // (pre-exención) de las 4 cédulas, cada una ya floreada en 0 — equivale
  // a limitada+ordinaria de cada una.
  const casilla91 = redondearMiles(rentaLiquidaCedulas.reduce((s, v) => s + v, 0));

  const compras1Porciento = Math.min(entrada.comprasConFacturaElectronica * 0.01, 240 * uvt);
  const adicionDependientes = adicionDependientesArt336(entrada.numeroDependientesArt336, uvt);
  const casilla92 = redondearMiles(
    tope.limitadaPorCedula.reduce((s, v) => s + v, 0) + adicionDependientes + compras1Porciento
  );

  const casilla93 = noNegativo(casilla91 - casilla92);

  // Comparación patrimonial (casilla 96) — solo entra si Daniela ya la
  // revisó con el cliente y decide incluirla (ver comparacionPatrimonial.js).
  const casilla96 = entrada.rentaPorComparacionPatrimonialManual || 0;
  const casilla97 = redondearMiles(noNegativo(casilla93 + casilla96));

  // Pensiones (99-103) — CED.2 PENSIONES, tope propio 12.000 UVT (Art. 206
  // núm. 5 ET, distinto del tope combinado 1.340 UVT de la cédula general).
  const casilla99 = redondearMiles(pensiones.ingresosBrutos);
  const casilla100 = redondearMiles(pensiones.incrngo);
  const casilla101 = redondearMiles(pensiones.rentaLiquida);
  const casilla102 = redondearMiles(pensiones.totalRentasExentas);
  const casilla103 = redondearMiles(pensiones.rentaLiquidaGravable);

  // Dividendos y participaciones (104-110) — CED.3 DIVIDENDOS. El
  // tratamiento tributario (tarifas 35%/descuento Art. 254-1 ET) vive en
  // impuestoDividendos.js, ver casillas 118-120 y 124 más abajo.
  const casilla104 = redondearMiles(dividendos.total2016);
  const casilla105 = redondearMiles(dividendos.incrngo2016);
  const casilla106 = redondearMiles(dividendos.rentaLiquida2016);
  const casilla107 = redondearMiles(dividendos.rentaLiquidaSubcedula1);
  const casilla108 = redondearMiles(dividendos.rentaLiquidaSubcedula2);
  const casilla109 = redondearMiles(dividendos.rentaLiquidaPasivaExterior);
  const casilla110 = redondearMiles(dividendos.rentaExentaExterior);

  const impuestoDiv = calcularImpuestoDividendos(dividendos, uvt);

  // Casilla 111 — Renta líquida gravable: cédula general (renta presuntiva
  // confirmada 0% ET, nunca es mayor) + pensiones + dividendos subcédula 1
  // + remanente de subcédula 2 después de su tarifa plana del 35%. Los
  // dividendos 2016 (106) y del exterior/ECE (109-110) NO entran aquí —
  // tienen tarifa plana propia (casillas 119 y 120, CONSOLIDADO RLC!H11).
  const casilla111 = redondearMiles(casilla97 + casilla103 + casilla107 + impuestoDiv.remanenteSubcedula2ParaArt241);

  // Impuesto sobre las rentas líquidas gravables (116-121).
  const casilla116 = impuestoArt241(casilla111, uvt);
  const casilla117 = 0; // renta presuntiva mayor a la líquida — confirmado 0% ET, nunca aplica
  const casilla118 = impuestoDiv.impuestoSubcedula2;
  const casilla119 = impuestoDiv.impuestoDiv2016;
  const casilla120 = impuestoDiv.impuestoExterior;
  const casilla121 = redondearMiles(casilla116 + casilla117 + casilla118 + casilla119 + casilla120);

  // Descuentos tributarios (122-125) — el simplificado "otros descuentos"
  // ya digitado (122+123+casos raros, ver descuentos.js) más el descuento
  // Art. 254-1 ET de dividendos (124), calculado en impuestoDividendos.js.
  const casilla124 = impuestoDiv.descuentoDividendos;
  const descuentosAplicados = calcularDescuentos((entrada.descuentosTributariosDigitados || 0) + casilla124, casilla121);
  const { impuestoNeto } = calcularImpuestoNeto(casilla121, descuentosAplicados);
  const casilla126 = impuestoNeto;

  // Ganancia ocasional (112-115, 127-128) — base y tarifa propias (15%/20%),
  // NO pasa por la tabla Art. 241 ET.
  const casilla112 = redondearMiles(gananciaOcasional.ingresosTotales);
  const casilla113 = redondearMiles(gananciaOcasional.costosAplicados);
  const casilla114 = redondearMiles(gananciaOcasional.exentasAplicadas);
  const casilla115 = redondearMiles(gananciaOcasional.gananciaOcasionalGravable);
  const casilla127 = gananciaOcasional.impuestoGananciaOcasional;
  const casilla128 = 0; // descuento impuestos exterior sobre ganancia ocasional — fuera de alcance (caso raro)

  const casilla129 = redondearMiles(noNegativo(casilla126 + casilla127 - casilla128));

  const retenciones = redondearMiles(entrada.retencionesPracticadas);
  const anticipoCalc = calcularAnticipo(casilla126, entrada.impuestoNetoAnioAnterior, retenciones, entrada.antiguedadDeclarante);
  const casilla133 = anticipoCalc.anticipo;

  const casilla130 = redondearMiles(entrada.anticipoAnioAnterior);
  const casilla131 = redondearMiles(entrada.saldoAFavorAnioAnteriorSinSolicitud);
  const casilla132 = retenciones;
  const casilla135 = redondearMiles(entrada.sanciones || 0);

  const casilla134 = redondearMiles(noNegativo(casilla129 + casilla133 - casilla130 - casilla131 - casilla132));
  const casilla136 = redondearMiles(noNegativo(casilla129 + casilla133 + casilla135 - casilla130 - casilla131 - casilla132));
  const casilla137 = redondearMiles(noNegativo(casilla130 + casilla131 + casilla132 - casilla129 - casilla133 - casilla135));

  const cliente = entrada.cliente || {};
  const casillasIdentificacion = {
    1: entrada.anioGravable,
    5: cliente.cedula || '',
    6: calcularDigitoVerificacion(cliente.cedula) ?? '',
    7: cliente.primerApellido || '',
    8: cliente.segundoApellido || '',
    9: cliente.primerNombre || '',
    10: cliente.otrosNombres || '',
    12: cliente.codigoDireccionSeccional || '',
    24: cliente.actividadEconomica || '',
  };

  return {
    casillas: {
      ...casillasIdentificacion,
      ...casillasPorCedula,
      28: redondearMiles(compras1Porciento),
      29: entrada.patrimonio.patrimonioBruto,
      30: entrada.patrimonio.deudas,
      31: entrada.patrimonio.patrimonioLiquido,
      91: casilla91,
      92: casilla92,
      93: casilla93,
      96: casilla96,
      97: casilla97,
      99: casilla99,
      100: casilla100,
      101: casilla101,
      102: casilla102,
      103: casilla103,
      104: casilla104,
      105: casilla105,
      106: casilla106,
      107: casilla107,
      108: casilla108,
      109: casilla109,
      110: casilla110,
      111: casilla111,
      112: casilla112,
      113: casilla113,
      114: casilla114,
      115: casilla115,
      116: casilla116,
      117: casilla117,
      118: casilla118,
      119: casilla119,
      120: casilla120,
      121: casilla121,
      124: casilla124,
      125: descuentosAplicados,
      126: casilla126,
      127: casilla127,
      128: casilla128,
      129: casilla129,
      130: casilla130,
      131: casilla131,
      132: casilla132,
      133: casilla133,
      134: casilla134,
      135: casilla135,
      136: casilla136,
      137: casilla137,
      138: entrada.numeroDependientesArt336,
      139: adicionDependientes,
    },
    intermedios: { tope, rentaLiquidaPorCedula, anticipoCalc, impuestoDiv },
    advertencias,
  };
}
