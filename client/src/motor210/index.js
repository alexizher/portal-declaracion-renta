// Orquestador principal del liquidador F210 — resuelve las dependencias
// entre módulos (topes compartidos en cascada, dependientes prorrateados,
// comparación patrimonial en dos pasadas) y expone un único punto de
// entrada. Ver docs/reglas-tributarias-AG2025.md para la fundamentación
// normativa de cada pieza.
import { calcularCedulaTrabajo } from './cedulas/trabajo.js';
import { calcularCedulaHonorariosServicios } from './cedulas/honorariosServicios.js';
import { calcularCedulaCapital } from './cedulas/capital.js';
import { calcularCedulaNoLaboral } from './cedulas/noLaboral.js';
import { calcularCedulaPensiones } from './cedulas/pensiones.js';
import { calcularCedulaDividendos } from './cedulas/dividendos.js';
import { calcularGananciaOcasional } from './gananciaOcasional.js';
import { deduccionDependientesArt387 } from './dependientes.js';
import { calcularPatrimonio } from './patrimonio.js';
import { totalActivosConReajuste } from './reajusteFiscal.js';
import { calcularRentaPorComparacionPatrimonial } from './comparacionPatrimonial.js';
import { calcularFormulario210 } from './formulario210.js';

const TOPE_MEDICINA_UVT = 192;
const TOPE_VIVIENDA_UVT = 1200;
const TOPE_ICETEX_UVT = 100;

/**
 * @param {object} entrada Ver client/src/vistas/liquidador210/Wizard.jsx
 *   para la forma completa capturada por el asistente. Estructura mínima:
 *   { uvt, mesesTrabajados, ingresoMensualPromedio6m, trabajo, honorarios,
 *     capital, noLaboral, tieneDependienteArt387, numeroDependientesArt336,
 *     comprasConFacturaElectronica, activosPatrimonio, deudasPatrimonio,
 *     patrimonioLiquidoAnioAnterior, impuestosYAnticiposPagadosAnioGravable,
 *     descuentosTributariosDigitados, filasRetenciones, impuestoNetoAnioAnterior,
 *     anticipoAnioAnterior, saldoAFavorAnioAnteriorSinSolicitud, antiguedadDeclarante,
 *     sanciones, incluirComparacionPatrimonial }
 * @returns {{casillas:object, intermedios:object, advertencias:string[]}}
 */
export function liquidar(entrada) {
  const { uvt } = entrada;
  const advertencias = [];

  // 1) Cédula trabajo primero — siempre va primera en las cascadas
  // compartidas, así que se calcula con el tope completo disponible.
  const trabajo = calcularCedulaTrabajo(entrada.trabajo, {
    uvt,
    ingresoMensualPromedio6m: entrada.ingresoMensualPromedio6m,
    mesesTrabajados: entrada.mesesTrabajados,
  });

  // 2) Dependientes Art. 387 ET — prorrateado entre trabajo y honorarios
  // según ingresos brutos. Necesita el ingreso bruto de honorarios, que a
  // su vez no depende de los topes compartidos — se calcula con un valor
  // provisional de honorarios usando tope=0 para obtener solo sus ingresos
  // brutos (los ingresos no dependen del tope de deducciones).
  const ingresosBrutosHonorariosProvisional = calcularCedulaHonorariosServicios(
    { ...entrada.honorarios, medicinaDigitado: 0, viviendaDigitado: 0, icetexDigitado: 0 },
    { uvt, medicinaDisponible: 0, viviendaDisponible: 0, icetexDisponible: 0 }
  ).ingresosBrutos;

  const dependientesArt387 = deduccionDependientesArt387(
    entrada.tieneDependienteArt387,
    trabajo.ingresosBrutos,
    ingresosBrutosHonorariosProvisional,
    uvt
  );

  // 3) Topes compartidos en cascada (trabajo → honorarios → capital → no
  // laboral) — medicina solo entre trabajo/honorarios; vivienda e ICETEX
  // entre las 4. Ver cascada.js y docs §2bis.
  const medicinaDisponibleHonorarios = Math.max(0, TOPE_MEDICINA_UVT * uvt - trabajo.medicinaLimitada);
  const viviendaDisponibleHonorarios = Math.max(0, TOPE_VIVIENDA_UVT * uvt - trabajo.viviendaLimitada);
  const icetexDisponibleHonorarios = Math.max(0, TOPE_ICETEX_UVT * uvt - trabajo.icetexLimitado);

  const honorarios = calcularCedulaHonorariosServicios(entrada.honorarios, {
    uvt,
    medicinaDisponible: medicinaDisponibleHonorarios,
    viviendaDisponible: viviendaDisponibleHonorarios,
    icetexDisponible: icetexDisponibleHonorarios,
  });

  const viviendaDisponibleCapital = Math.max(0, viviendaDisponibleHonorarios - honorarios.viviendaLimitada);
  const icetexDisponibleCapital = Math.max(0, icetexDisponibleHonorarios - honorarios.icetexLimitado);

  const capital = calcularCedulaCapital(entrada.capital, {
    uvt,
    componenteInflacionarioTasa: entrada.componenteInflacionarioTasa,
    componenteInflacionarioGastosTasa: entrada.componenteInflacionarioGastosTasa,
    viviendaDisponible: viviendaDisponibleCapital,
    icetexDisponible: icetexDisponibleCapital,
  });

  const viviendaDisponibleNoLaboral = Math.max(0, viviendaDisponibleCapital - capital.viviendaLimitada);
  const icetexDisponibleNoLaboral = Math.max(0, icetexDisponibleCapital - capital.icetexLimitado);

  const noLaboral = calcularCedulaNoLaboral(entrada.noLaboral, {
    uvt,
    viviendaDisponible: viviendaDisponibleNoLaboral,
    icetexDisponible: icetexDisponibleNoLaboral,
  });

  // 4) Sumar dependientes Art. 387 a la bolsa "limitada" de cada cédula
  // (trabajo/honorarios) ahora que se conoce el reparto.
  trabajo.baseExentasYDeduccionesLimitadas += dependientesArt387.trabajo;
  honorarios.baseExentasYDeduccionesLimitadas += dependientesArt387.honorarios;

  // 5) Patrimonio — incluye los activos fijos con reajuste fiscal detallado
  // (Art. 70/73 ET, ver reajusteFiscal.js) encima de las categorías simples.
  const totalReajuste = totalActivosConReajuste(entrada.activosConReajuste, {
    anioGravable: entrada.anioGravable,
    tasaReajusteFiscal: entrada.tasaReajusteFiscal,
  });
  const patrimonio = calcularPatrimonio(entrada.activosPatrimonio, entrada.deudasPatrimonio, totalReajuste);

  // 5b) Pensiones, dividendos y ganancia ocasional — cédulas/base
  // independientes de los topes compartidos en cascada (cada una tiene su
  // propio tope o tarifa, ver docs §7).
  const pensiones = calcularCedulaPensiones(entrada.pensiones, { uvt });
  const dividendos = calcularCedulaDividendos(entrada.dividendos);
  const gananciaOcasional = calcularGananciaOcasional(entrada.gananciaOcasional, { uvt });

  // 6) Primera pasada del Formulario 210 SIN renta por comparación
  // patrimonial (se calcula después, con el resultado de esta pasada).
  const cedulas = [trabajo, honorarios, capital, noLaboral];
  const entradaComun = {
    uvt,
    cliente: entrada.cliente,
    anioGravable: entrada.anioGravable,
    cedulas,
    pensiones,
    dividendos,
    gananciaOcasional,
    numeroDependientesArt336: entrada.numeroDependientesArt336,
    comprasConFacturaElectronica: entrada.comprasConFacturaElectronica,
    patrimonio,
    descuentosTributariosDigitados: entrada.descuentosTributariosDigitados,
    retencionesPracticadas: entrada.retencionesPracticadas,
    impuestoNetoAnioAnterior: entrada.impuestoNetoAnioAnterior,
    anticipoAnioAnterior: entrada.anticipoAnioAnterior,
    saldoAFavorAnioAnteriorSinSolicitud: entrada.saldoAFavorAnioAnteriorSinSolicitud,
    antiguedadDeclarante: entrada.antiguedadDeclarante,
    sanciones: entrada.sanciones,
  };

  const primeraPasada = calcularFormulario210({ ...entradaComun, rentaPorComparacionPatrimonialManual: 0 });

  // 7) Comparación patrimonial (Art. 236-239 ET) — diagnóstico basado en
  // la primera pasada. NO se incluye automáticamente en la casilla 96; se
  // muestra como advertencia para que Daniela decida tras revisar con el
  // cliente (activos omitidos, pasivos inexistentes).
  const rentasExentasTotalesAprox =
    trabajo.rentaExenta25 +
    cedulas.reduce((s, c) => s + (c.rentasExentasNoLimitadas || 0), 0) +
    primeraPasada.intermedios.tope.limitadaPorCedula.reduce((s, v) => s + v, 0);
  const incrngoTotal = cedulas.reduce((s, c) => s + c.incrngo, 0);

  const comparacion = calcularRentaPorComparacionPatrimonial({
    patrimonioLiquidoActual: patrimonio.patrimonioLiquido,
    patrimonioLiquidoAnioAnterior: entrada.patrimonioLiquidoAnioAnterior,
    gananciaOcasionalNeta: gananciaOcasional.ingresosTotales - gananciaOcasional.costosAplicados,
    valorizaciones: entrada.valorizaciones || 0,
    desvalorizaciones: entrada.desvalorizaciones || 0,
    rentaLiquidaGravable: primeraPasada.casillas[111],
    rentasExentasTotales: rentasExentasTotalesAprox,
    incrngoTotal,
    impuestosYAnticiposPagadosAnioGravable: entrada.impuestosYAnticiposPagadosAnioGravable,
    retencionesPracticadas: entrada.retencionesPracticadas,
  });
  advertencias.push(...comparacion.advertencias);

  // 8) Si Daniela ya confirmó incluir el hallazgo (entrada.incluirComparacionPatrimonial),
  // se recalcula el formulario con la casilla 96 poblada.
  const resultadoFinal = entrada.incluirComparacionPatrimonial
    ? calcularFormulario210({ ...entradaComun, rentaPorComparacionPatrimonialManual: comparacion.rentaPorComparacion })
    : primeraPasada;

  advertencias.push(...trabajo.advertencias, ...primeraPasada.advertencias);

  return {
    casillas: resultadoFinal.casillas,
    intermedios: {
      trabajo,
      honorarios,
      capital,
      noLaboral,
      pensiones,
      dividendos,
      gananciaOcasional,
      dependientesArt387,
      patrimonio,
      comparacion,
      // tope, rentaLiquidaPorCedula, anticipoCalc, impuestoDiv — ver formulario210.js.
      ...resultadoFinal.intermedios,
    },
    advertencias,
  };
}
