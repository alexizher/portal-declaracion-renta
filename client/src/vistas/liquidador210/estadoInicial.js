import {
  CONCEPTOS_INGRESOS_TRABAJO,
  CONCEPTOS_INCRNGO_TRABAJO,
  CONCEPTOS_DEDUCCIONES_TRABAJO,
  CONCEPTOS_RENTAS_EXENTAS_LIMITADAS_TRABAJO,
  CONCEPTOS_RENTAS_EXENTAS_NO_LIMITADAS_TRABAJO,
  CONCEPTOS_INGRESOS_HONORARIOS,
  CONCEPTOS_INGRESOS_CAPITAL,
  CONCEPTOS_COSTOS_GASTOS_CAPITAL,
  CONCEPTOS_INGRESOS_NO_LABORAL,
  CONCEPTOS_INGRESOS_PENSIONES,
  CONCEPTOS_INGRESOS_EXTERIOR_PENSIONES,
  CONCEPTOS_INCRNGO_PENSIONES,
  CONCEPTOS_DIVIDENDOS_2016,
  CONCEPTOS_INGRESOS_GANANCIA_OCASIONAL,
  CONCEPTOS_COSTOS_GANANCIA_OCASIONAL,
  CONCEPTOS_EXENTAS_GANANCIA_OCASIONAL,
  CATEGORIAS_PATRIMONIO,
} from './conceptos.js';
import { UVT_POR_ANIO } from '../../motor210/constantes/uvt.js';
import { dividirNombreCompleto } from '../../motor210/identificacion.js';

function enCeros(conceptos) {
  return Object.fromEntries(conceptos.map((c) => [c.clave, 0]));
}

// Componente inflacionario por año — DATOS BÁSICOS del .xlsm de
// referencia (E28). AG2024 validado contra el Excel; AG2025 = 55.43%
// (dato oficial confirmado por el usuario 2026-08-09 — el .xlsm de
// referencia traía el año 2025 en 0 porque aún no se había publicado).
export const COMPONENTE_INFLACIONARIO_POR_ANIO = { 2024: 0.5088, 2025: 0.5543 };

// Componente inflacionario de GASTOS financieros (DATOS BÁSICOS!E29) —
// distinto del de rendimientos/ingresos (E28, arriba). Afecta solo la línea
// "Gastos financieros" de costos y gastos de capital. AG2025 = 28.35%
// (Decreto DIAN, confirmado por búsqueda web 2026-08-09 — mismo patrón de
// placeholder que los otros dos: el .xlsm de referencia traía 0 porque aún
// no se había publicado cuando se hizo esa copia).
export const COMPONENTE_INFLACIONARIO_GASTOS_POR_ANIO = { 2024: 0.2501, 2025: 0.2835 };

// Reajuste fiscal anual (Art. 70 ET, DATOS BÁSICOS!E18) — % único publicado
// por la DIAN cada año, opcional, sobre activos fijos. AG2025 = 5.81%
// (dato oficial confirmado por el usuario 2026-08-09 — el .xlsm de
// referencia traía el año 2025 en 0 porque aún no se había publicado).
export const REAJUSTE_FISCAL_POR_ANIO = { 2024: 0.1097, 2025: 0.0581 };

export function crearEstadoInicial(anioGravable = 2025) {
  return {
    anioGravable,
    uvt: UVT_POR_ANIO[anioGravable],
    mesesTrabajados: 12,
    ingresoMensualPromedio6m: 0,
    componenteInflacionarioTasa: COMPONENTE_INFLACIONARIO_POR_ANIO[anioGravable] ?? 0.5088,
    componenteInflacionarioGastosTasa: COMPONENTE_INFLACIONARIO_GASTOS_POR_ANIO[anioGravable] ?? 0.2501,
    tasaReajusteFiscal: REAJUSTE_FISCAL_POR_ANIO[anioGravable] ?? 0.1097,

    cliente: {
      nombre: '',
      cedula: '',
      tipoDocumento: 'cedula', // 'cedula' | 'nit'
      primerApellido: '',
      segundoApellido: '',
      primerNombre: '',
      otrosNombres: '',
      actividadEconomica: '',
      codigoDireccionSeccional: '',
      granContribuyente: false,
    },

    trabajo: {
      ingresos: enCeros(CONCEPTOS_INGRESOS_TRABAJO),
      incrngo: enCeros(CONCEPTOS_INCRNGO_TRABAJO),
      deducciones: enCeros(CONCEPTOS_DEDUCCIONES_TRABAJO),
      rentasExentasLimitadas: enCeros(CONCEPTOS_RENTAS_EXENTAS_LIMITADAS_TRABAJO),
      rentasExentasNoLimitadas: enCeros(CONCEPTOS_RENTAS_EXENTAS_NO_LIMITADAS_TRABAJO),
      afcPensionVoluntaria: 0,
      rentaExenta25Manual: null, // null = automático (Art. 206 núm. 10 ET); número = sobrescrito a mano
    },
    honorarios: {
      ingresos: enCeros(CONCEPTOS_INGRESOS_HONORARIOS),
      costosYGastos: 0,
      afcPensionVoluntaria: 0,
      medicinaDigitado: 0,
      viviendaDigitado: 0,
      icetexDigitado: 0,
    },
    capital: {
      ingresos: enCeros(CONCEPTOS_INGRESOS_CAPITAL),
      costosYGastos: enCeros(CONCEPTOS_COSTOS_GASTOS_CAPITAL),
      afcPensionVoluntaria: 0,
      viviendaDigitado: 0,
      icetexDigitado: 0,
    },
    noLaboral: {
      ingresos: enCeros(CONCEPTOS_INGRESOS_NO_LABORAL),
      devolucionesRebajas: 0,
      costosYGastos: 0,
      afcPensionVoluntaria: 0,
      viviendaDigitado: 0,
      icetexDigitado: 0,
    },

    pensiones: {
      ingresos: enCeros(CONCEPTOS_INGRESOS_PENSIONES),
      ingresosExterior: enCeros(CONCEPTOS_INGRESOS_EXTERIOR_PENSIONES),
      incrngo: enCeros(CONCEPTOS_INCRNGO_PENSIONES),
      afcPensionVoluntaria: 0,
    },
    dividendos: {
      anio2016yAnteriores: enCeros(CONCEPTOS_DIVIDENDOS_2016),
      subcedula1NoGravados: 0,
      subcedula2Gravados: 0,
      rentaLiquidaPasivaExterior: 0,
      rentaExentaExterior: 0,
    },
    gananciaOcasional: {
      ingresos: enCeros(CONCEPTOS_INGRESOS_GANANCIA_OCASIONAL),
      loteriasRifas: 0,
      gananciasExterior: 0,
      costos: enCeros(CONCEPTOS_COSTOS_GANANCIA_OCASIONAL),
      exentas: enCeros(CONCEPTOS_EXENTAS_GANANCIA_OCASIONAL),
    },

    tieneDependienteArt387: false,
    numeroDependientesArt336: 0,
    comprasConFacturaElectronica: 0,

    activosPatrimonio: enCeros(CATEGORIAS_PATRIMONIO),
    deudasPatrimonio: 0,
    activosConReajuste: [],

    patrimonioLiquidoAnioAnterior: 0,
    impuestoNetoAnioAnterior: 0,
    anticipoAnioAnterior: 0,
    saldoAFavorAnioAnteriorSinSolicitud: 0,
    impuestosYAnticiposPagadosAnioGravable: 0,
    antiguedadDeclarante: 'terceroYSiguientes',

    descuentosTributariosDigitados: 0,
    filasRetenciones: [],
    sanciones: 0,

    incluirComparacionPatrimonial: false,
  };
}

function esObjetoPlano(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function fusionarProfundo(base, guardado) {
  const resultado = { ...base };
  for (const clave of Object.keys(base)) {
    if (!(clave in guardado)) continue;
    resultado[clave] =
      esObjetoPlano(base[clave]) && esObjetoPlano(guardado[clave])
        ? fusionarProfundo(base[clave], guardado[clave])
        : guardado[clave];
  }
  return resultado;
}

/**
 * Combina un estado guardado en localStorage (posiblemente de una versión
 * anterior del wizard, con menos campos) con la plantilla actual de
 * `crearEstadoInicial()`. Los campos nuevos que el estado guardado no tenía
 * quedan en su valor por defecto (no `undefined`) — evita que
 * `SeccionConceptos` truene al recorrer un objeto de conceptos que no
 * existía cuando se guardó ese cliente.
 */
export function fusionarConEstadoInicial(estadoGuardado) {
  const base = crearEstadoInicial(estadoGuardado?.anioGravable);
  if (!esObjetoPlano(estadoGuardado)) return base;
  const fusionado = fusionarProfundo(base, estadoGuardado);

  // Guardados de antes de la identificación separada (Fase 1) solo tenían
  // "nombre" en una sola cadena — se divide como punto de partida editable
  // para que no se vea todo en blanco pese a que sí hay un cliente cargado.
  if (fusionado.cliente.nombre && !fusionado.cliente.primerNombre && !fusionado.cliente.primerApellido) {
    Object.assign(fusionado.cliente, dividirNombreCompleto(fusionado.cliente.nombre));
  }

  return fusionado;
}
