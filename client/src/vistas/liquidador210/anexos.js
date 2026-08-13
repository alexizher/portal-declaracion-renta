// Construye los "Anexos de la declaración" — un informe narrativo y
// resumido, organizado por sección del F210, pensado para que el cliente
// (no un contador) entienda qué se declaró y cómo se llegó al resultado.
// A diferencia de papelTrabajo.js (memoria de cálculo técnica para
// Daniela), este informe solo muestra los conceptos con valor > 0 y usa
// lenguaje llano — ver PasoResultado.jsx para el botón que lo abre.
import { SECCIONES_FORMULARIO_210 } from '../../motor210/etiquetasCasillas.js';
import { calcularValorActivoConReajuste } from '../../motor210/reajusteFiscal.js';
import {
  CATEGORIAS_PATRIMONIO,
  CONCEPTOS_INGRESOS_TRABAJO,
  CONCEPTOS_INCRNGO_TRABAJO,
  CONCEPTOS_DEDUCCIONES_TRABAJO,
  CONCEPTOS_RENTAS_EXENTAS_LIMITADAS_TRABAJO,
  CONCEPTOS_RENTAS_EXENTAS_NO_LIMITADAS_TRABAJO,
  CONCEPTOS_INGRESOS_HONORARIOS,
  CONCEPTOS_INCRNGO_HONORARIOS,
  CONCEPTOS_RENTAS_EXENTAS_LIMITADAS_HONORARIOS,
  CONCEPTOS_RENTAS_EXENTAS_NO_LIMITADAS_HONORARIOS,
  CONCEPTOS_INGRESOS_CAPITAL,
  CONCEPTOS_COSTOS_GASTOS_CAPITAL,
  CONCEPTOS_INGRESOS_NO_LABORAL,
  CONCEPTOS_INCRNGO_NO_LABORAL,
  CONCEPTOS_RENTAS_EXENTAS_LIMITADAS_NO_LABORAL,
  CONCEPTOS_RENTAS_EXENTAS_NO_LIMITADAS_NO_LABORAL,
  CONCEPTOS_INGRESOS_PENSIONES,
  CONCEPTOS_INGRESOS_EXTERIOR_PENSIONES,
  CONCEPTOS_INCRNGO_PENSIONES,
  CONCEPTOS_DIVIDENDOS_2016,
  CONCEPTOS_INGRESOS_GANANCIA_OCASIONAL,
  CONCEPTOS_COSTOS_GANANCIA_OCASIONAL,
  CONCEPTOS_EXENTAS_GANANCIA_OCASIONAL,
} from './conceptos.js';

function itemsConValor(conceptos, valores) {
  if (!valores) return [];
  return conceptos
    .filter((c) => (valores[c.clave] || 0) > 0)
    .map((c) => ({ etiqueta: c.etiqueta, valor: valores[c.clave] }));
}

function casillasDeSeccion(titulo, casillas) {
  const seccion = SECCIONES_FORMULARIO_210.find((s) => s.titulo === titulo);
  if (!seccion) return [];
  return seccion.casillas
    .filter((c) => Math.abs(casillas[c.casilla] || 0) > 0)
    .map((c) => ({ etiqueta: c.etiqueta, valor: casillas[c.casilla] }));
}

/**
 * @param {{casillas:object, intermedios:object, advertencias:string[]}} resultado Salida de motor210/index.js liquidar().
 * @param {object} estado Estado completo del wizard (ver estadoInicial.js) — se usa para el detalle "qué se declaró".
 * @param {{nombre:string, cedula:string, anioGravable:number}} cliente
 * @returns {{cliente:object, generado:Date, secciones:Array}}
 */
export function construirAnexos(resultado, estado, cliente) {
  const { casillas, intermedios } = resultado;
  const secciones = [];

  // ---- Patrimonio ----
  const activosDeclarados = itemsConValor(CATEGORIAS_PATRIMONIO, estado.activosPatrimonio);
  const activosConReajuste = (estado.activosConReajuste || [])
    .filter((a) => a.descripcion)
    .map((a) => ({
      etiqueta: a.descripcion,
      valor: calcularValorActivoConReajuste(a, {
        anioGravable: estado.anioGravable,
        tasaReajusteFiscal: estado.tasaReajusteFiscal,
      }).valorPatrimonial,
    }));
  const declaradoPatrimonio = [...activosDeclarados, ...activosConReajuste];
  if (estado.deudasPatrimonio > 0) declaradoPatrimonio.push({ etiqueta: 'Deudas (nacionales + exterior)', valor: estado.deudasPatrimonio });
  secciones.push({
    id: 'patrimonio',
    titulo: 'Patrimonio',
    destacada: true,
    parrafo:
      'Lo que el cliente posee y debe a 31 de diciembre — la diferencia entre ambos es el patrimonio líquido que queda en la declaración.',
    declarado: declaradoPatrimonio,
    calculo: casillasDeSeccion('Patrimonio', casillas),
  });

  // ---- Cédula general ----
  const CEDULAS_GENERAL = [
    {
      clave: 'trabajo',
      titulo: 'Rentas de trabajo',
      parrafo:
        'Salarios, prestaciones y demás pagos por una relación laboral o legal y reglamentaria — se restan los ingresos no constitutivos de renta, las deducciones y las rentas exentas (como el 25% exento) para llegar a la renta líquida de esta cédula.',
      catalogos: {
        ingresos: CONCEPTOS_INGRESOS_TRABAJO,
        incrngo: CONCEPTOS_INCRNGO_TRABAJO,
        deducciones: CONCEPTOS_DEDUCCIONES_TRABAJO,
        rentasExentasLimitadas: CONCEPTOS_RENTAS_EXENTAS_LIMITADAS_TRABAJO,
        rentasExentasNoLimitadas: CONCEPTOS_RENTAS_EXENTAS_NO_LIMITADAS_TRABAJO,
      },
      tituloCasillas: 'Cédula general — rentas de trabajo',
    },
    {
      clave: 'honorarios',
      titulo: 'Rentas de honorarios (sin relación laboral)',
      parrafo:
        'Honorarios, comisiones y servicios prestados de forma independiente, sin que exista subordinación laboral — tributan dentro de la misma cédula general, con sus propios topes de rentas exentas.',
      catalogos: {
        ingresos: CONCEPTOS_INGRESOS_HONORARIOS,
        incrngo: CONCEPTOS_INCRNGO_HONORARIOS,
        rentasExentasLimitadas: CONCEPTOS_RENTAS_EXENTAS_LIMITADAS_HONORARIOS,
        rentasExentasNoLimitadas: CONCEPTOS_RENTAS_EXENTAS_NO_LIMITADAS_HONORARIOS,
      },
      tituloCasillas: 'Cédula general — rentas de honorarios (sin relación laboral)',
    },
    {
      clave: 'capital',
      titulo: 'Rentas de capital',
      parrafo:
        'Intereses, arrendamientos y rendimientos financieros — se declaran los ingresos brutos y, frente a ellos, los costos y gastos asociados que la ley permite restar.',
      catalogos: {
        ingresos: CONCEPTOS_INGRESOS_CAPITAL,
        costosYGastos: CONCEPTOS_COSTOS_GASTOS_CAPITAL,
      },
      tituloCasillas: 'Cédula general — rentas de capital',
    },
    {
      clave: 'noLaboral',
      titulo: 'Rentas no laborales',
      parrafo:
        'Todo ingreso que no encaja en las categorías anteriores (por ejemplo, venta ocasional de bienes o servicios) — es la cédula "de cierre" dentro de la cédula general.',
      catalogos: {
        ingresos: CONCEPTOS_INGRESOS_NO_LABORAL,
        incrngo: CONCEPTOS_INCRNGO_NO_LABORAL,
        rentasExentasLimitadas: CONCEPTOS_RENTAS_EXENTAS_LIMITADAS_NO_LABORAL,
        rentasExentasNoLimitadas: CONCEPTOS_RENTAS_EXENTAS_NO_LIMITADAS_NO_LABORAL,
      },
      tituloCasillas: 'Cédula general — rentas no laborales',
    },
  ];

  for (const cedula of CEDULAS_GENERAL) {
    const ingresosBrutos = intermedios[cedula.clave]?.ingresosBrutos || 0;
    if (ingresosBrutos <= 0) continue;
    const declarado = Object.entries(cedula.catalogos).flatMap(([campo, catalogo]) =>
      itemsConValor(catalogo, estado[cedula.clave]?.[campo])
    );
    secciones.push({
      id: cedula.clave,
      titulo: cedula.titulo,
      parrafo: cedula.parrafo,
      declarado,
      calculo: casillasDeSeccion(cedula.tituloCasillas, casillas),
    });
  }

  secciones.push({
    id: 'consolidadoGeneral',
    titulo: 'Cédula general — consolidado',
    parrafo: 'Suma de las cuatro rentas anteriores, con los topes y compensaciones que aplican en conjunto.',
    calculo: casillasDeSeccion('Cédula general — consolidado', casillas),
  });

  // ---- Pensiones ----
  const declaradoPensiones = [
    ...itemsConValor(CONCEPTOS_INGRESOS_PENSIONES, estado.pensiones?.ingresos),
    ...itemsConValor(CONCEPTOS_INGRESOS_EXTERIOR_PENSIONES, estado.pensiones?.ingresosExterior),
    ...itemsConValor(CONCEPTOS_INCRNGO_PENSIONES, estado.pensiones?.incrngo),
  ];
  if (declaradoPensiones.length > 0) {
    secciones.push({
      id: 'pensiones',
      titulo: 'Cédula de pensiones',
      parrafo: 'Mesadas pensionales de origen nacional o extranjero — tiene su propio tope de renta exenta, independiente del de la cédula general.',
      declarado: declaradoPensiones,
      calculo: casillasDeSeccion('Cédula de pensiones', casillas),
    });
  }

  // ---- Dividendos ----
  const declaradoDividendos = itemsConValor(CONCEPTOS_DIVIDENDOS_2016, estado.dividendos?.anio2016yAnteriores);
  if (estado.dividendos?.subcedula1NoGravados > 0)
    declaradoDividendos.push({ etiqueta: 'Dividendos no gravados 2017 y siguientes', valor: estado.dividendos.subcedula1NoGravados });
  if (estado.dividendos?.subcedula2Gravados > 0)
    declaradoDividendos.push({ etiqueta: 'Dividendos gravados 2017 y siguientes', valor: estado.dividendos.subcedula2Gravados });
  if (estado.dividendos?.rentaLiquidaPasivaExterior > 0)
    declaradoDividendos.push({ etiqueta: 'Dividendos/renta pasiva del exterior', valor: estado.dividendos.rentaLiquidaPasivaExterior });
  if (declaradoDividendos.length > 0) {
    secciones.push({
      id: 'dividendos',
      titulo: 'Cédula de dividendos y participaciones',
      parrafo:
        'Dividendos y participaciones recibidos de sociedades — tributan aparte de las demás rentas, con tarifa distinta según si ya pagaron impuesto en cabeza de la sociedad que los reparte.',
      declarado: declaradoDividendos,
      calculo: casillasDeSeccion('Cédula de dividendos y participaciones', casillas),
    });
  }

  secciones.push({
    id: 'rentaLiquidaTotal',
    titulo: 'Renta líquida gravable total',
    destacada: true,
    parrafo: 'La suma de la cédula general, pensiones y dividendos — es la base sobre la que se liquida el impuesto de renta (Art. 241 ET).',
    calculo: casillasDeSeccion('Renta líquida gravable total', casillas),
  });

  // ---- Ganancia ocasional ----
  const declaradoGO = [
    ...itemsConValor(CONCEPTOS_INGRESOS_GANANCIA_OCASIONAL, estado.gananciaOcasional?.ingresos),
    ...itemsConValor(CONCEPTOS_COSTOS_GANANCIA_OCASIONAL, estado.gananciaOcasional?.costos),
    ...itemsConValor(CONCEPTOS_EXENTAS_GANANCIA_OCASIONAL, estado.gananciaOcasional?.exentas),
  ];
  if (estado.gananciaOcasional?.loteriasRifas > 0)
    declaradoGO.push({ etiqueta: 'Loterías, rifas y similares', valor: estado.gananciaOcasional.loteriasRifas });
  if (estado.gananciaOcasional?.gananciasExterior > 0)
    declaradoGO.push({ etiqueta: 'Ganancias ocasionales del exterior', valor: estado.gananciaOcasional.gananciasExterior });
  if (declaradoGO.length > 0) {
    secciones.push({
      id: 'gananciaOcasional',
      titulo: 'Ganancias ocasionales',
      parrafo:
        'Ingresos esporádicos y ajenos a la actividad habitual del cliente — herencias, loterías, o utilidad en la venta de activos fijos poseídos por más de dos años — que se liquidan aparte de las rentas líquidas gravables.',
      declarado: declaradoGO,
      calculo: casillasDeSeccion('Ganancias ocasionales', casillas),
    });
  }

  // ---- Liquidación del impuesto ----
  secciones.push({
    id: 'impuesto',
    titulo: 'Liquidación del impuesto',
    destacada: true,
    parrafo: 'Cómo se aplica la tarifa del impuesto sobre la base gravable, y los descuentos tributarios que la reducen.',
    calculo: [...casillasDeSeccion('Liquidación privada — impuesto', casillas), ...casillasDeSeccion('Descuentos', casillas)],
  });

  // ---- Retenciones, anticipo y saldo final ----
  const declaradoRetenciones = (estado.filasRetenciones || [])
    .filter((f) => f.retencion > 0)
    .map((f) => ({ etiqueta: [f.agenteRetenedor, f.concepto].filter(Boolean).join(' — ') || 'Retención', valor: f.retencion }));

  const anticipoCalc = intermedios.anticipoCalc;
  let notaAnticipo = anticipoCalc?.nota || null;
  if (!notaAnticipo && anticipoCalc) {
    notaAnticipo = `Se compara el Método 1 (promedio del impuesto neto de este año y el anterior) con el Método 2 (solo el de este año), ambos por la tarifa según la antigüedad como declarante, y se toma el menor: ${(
      anticipoCalc.metodo1
    )?.toLocaleString('es-CO')} vs. ${anticipoCalc.metodo2?.toLocaleString('es-CO')}.`;
  }

  secciones.push({
    id: 'anticipoSaldo',
    titulo: 'Retenciones, anticipo y saldo a pagar',
    destacada: true,
    parrafo: 'El impuesto a cargo se cruza contra lo ya pagado durante el año (retenciones) y el anticipo del año anterior; el anticipo de este año hacia el próximo se calcula por el método más favorable (Art. 807 ET).',
    declarado: declaradoRetenciones,
    notaAnticipo,
    calculo: casillasDeSeccion('Liquidación privada — impuesto neto y anticipo', casillas),
  });

  const saldoAPagar = casillas[136] || 0;
  const saldoAFavor = casillas[137] || 0;
  const resumenFinal = {
    saldoAPagar,
    saldoAFavor,
    etiqueta: saldoAPagar > 0 ? 'Saldo a pagar' : saldoAFavor > 0 ? 'Saldo a favor' : 'Declaración en ceros',
    valor: saldoAPagar > 0 ? saldoAPagar : saldoAFavor,
  };

  // ---- Resumen ejecutivo — los 4 números que resumen toda la declaración,
  // mostrados como tarjetas antes del detalle sección por sección.
  const resumenEjecutivo = [
    { etiqueta: 'Patrimonio líquido', valor: casillas[31] || 0 },
    { etiqueta: 'Renta líquida gravable', valor: casillas[111] || 0 },
    { etiqueta: 'Impuesto a cargo', valor: casillas[129] || 0 },
    { etiqueta: resumenFinal.etiqueta, valor: resumenFinal.valor, enfasis: true },
  ];

  // ---- Glosario — términos técnicos que aparecen en el informe, en
  // lenguaje llano para un cliente que no es contador.
  const glosario = [
    { termino: 'Cédula', definicion: 'Cada "casillero" en el que la DIAN agrupa un tipo de ingreso (trabajo, capital, pensiones, dividendos…). Cada uno tiene sus propias reglas de ingresos exentos y deducciones antes de sumarse al total.' },
    { termino: 'INCRNGO', definicion: 'Ingreso No Constitutivo de Renta ni Ganancia Ocasional: dinero que entra pero que la ley excluye de la base gravable (por ejemplo, aportes obligatorios a pensión).' },
    { termino: 'Renta exenta', definicion: 'Parte del ingreso que sí es renta, pero que la ley libera de impuesto hasta un tope — a diferencia del INCRNGO, si se pasa el tope el excedente sí tributa.' },
    { termino: 'Renta líquida gravable', definicion: 'La base final sobre la que se calcula el impuesto, después de sumar todas las cédulas y restar lo que la ley permite.' },
    { termino: 'Patrimonio líquido', definicion: 'Lo que el cliente posee (activos) menos lo que debe (pasivos) a 31 de diciembre del año declarado.' },
    { termino: 'Retención en la fuente', definicion: 'Impuesto que un tercero (empleador, banco, cliente) ya le descontó y pagó al cliente durante el año, y que se resta del impuesto a cargo en la declaración.' },
    { termino: 'Anticipo', definicion: 'Adelanto del impuesto del próximo año que se paga junto con esta declaración, calculado por el método más favorable para el cliente.' },
  ];

  return {
    cliente,
    generado: new Date(),
    advertencias: resultado.advertencias || [],
    resumenEjecutivo,
    secciones,
    resumenFinal,
    glosario,
  };
}
