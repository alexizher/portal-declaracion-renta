import { describe, it, expect } from 'vitest';
import { calcularCedulaTrabajo } from './cedulas/trabajo.js';
import { calcularCedulaCapital } from './cedulas/capital.js';
import { calcularCedulaNoLaboral } from './cedulas/noLaboral.js';
import { calcularCedulaPensiones } from './cedulas/pensiones.js';
import { calcularCedulaDividendos } from './cedulas/dividendos.js';
import { calcularGananciaOcasional } from './gananciaOcasional.js';
import { calcularFormulario210 } from './formulario210.js';

// Integración de punta a punta con el caso dorado completo (cliente real
// AG2024, anonimizado): trabajo + capital + no laboral pobladas,
// honorarios en cero. Cifras de origen: docs/reglas-tributarias-AG2025.md
// y los .md de xlsm-dump/CED.1_GENERAL, FORMULARIO_210.
//
// Nota sobre tolerancia: el .xlsm redondea a la unidad de mil en CADA
// casilla individual antes de sumar (H24, H26, H28... por separado); este
// motor redondea una sola vez al ensamblar la casilla final. La diferencia
// resultante es de máximo un par de miles de pesos — una variante de orden
// de redondeo (Art. 577 ET admite aproximación a la unidad de mil), no un
// error de cálculo. Por eso las aserciones de casillas agregadas usan
// tolerancia; las de cada cédula (ya cubiertas en sus propios tests) son exactas.
const TOLERANCIA_PESOS = 5000;

// Pensiones/dividendos/ganancia ocasional en 0 — el caso dorado (cliente
// real anonimizado) no tenía ninguna de estas 3. Se pasan ya CALCULADAS
// (salida de cada módulo), igual que `trabajo`/`capital`/`noLaboral` abajo
// — calcularFormulario210 espera resultados de cédula, no entradas crudas.
const pensionesVacias = calcularCedulaPensiones(
  {
    ingresos: { jubilacion: 0, invalidez: 0, vejez: 0, sobrevivientes: 0, riesgosProfesionales: 0, indemnizacionesSustitutivas: 0, devolucionSaldosAhorro: 0 },
    ingresosExterior: { sinConvenioJubilacionEtc: 0, sinConvenioOtras: 0, demasPaisesJubilacionEtc: 0, demasPaisesOtras: 0, canJubilacionEtc: 0, canOtras: 0 },
    incrngo: { saludObligatoria: 0, fondoSolidaridadPensional: 0, indemnizaciones: 0, otros: 0 },
    afcPensionVoluntaria: 0,
  },
  { uvt: 47065 }
);

const dividendosVacios = calcularCedulaDividendos({
  anio2016yAnteriores: { dividendosNoGravados: 0, dividendosGravados: 0, capitalizacionesNoGravadas: 0, capitalizacionesGravadas: 0, distribucionEceNoGravados: 0, distribucionEceGravados: 0 },
  subcedula1NoGravados: 0,
  subcedula2Gravados: 0,
  rentaLiquidaPasivaExterior: 0,
  rentaExentaExterior: 0,
});

const gananciaOcasionalVacia = calcularGananciaOcasional(
  {
    ingresos: { ventaActivosFijos2AniosOMas: 0, ventaAcciones2AniosOMas: 0, porcionConyugal: 0, liquidacionSociedades: 0, herencia: 0, legados: 0, indemnizacionSegurosVida: 0, donacionesInterVivos: 0 },
    loteriasRifas: 0,
    gananciasExterior: 0,
    costos: { costoVentaActivosFijos: 0, costoVentaAcciones: 0 },
    exentas: { ventaCasaAntes1987: 0, viviendaCausante: 0, inmuebleCausante: 0, herenciaLegado: 0, bienesTerceros: 0, librosRopaMobiliario: 0, ventaCasaHabitual: 0, accionesBVC: 0, exteriorEce: 0, otras: 0 },
  },
  { uvt: 47065 }
);

describe('calcularFormulario210 — integración con caso dorado completo', () => {
  const uvt = 47065;
  const ctxComun = { uvt, ingresoMensualPromedio6m: 7266000, mesesTrabajados: 12 };

  const trabajo = calcularCedulaTrabajo(
    {
      ingresos: {
        salarios: 75940000,
        cesantiasPagadas: 763000,
        cesantiasFondo: 6362000,
        cesantiasPre2017: 0,
        prestacionesSociales: 11569000,
        primasExtralegales: 0,
        comisionesBonificaciones: 0,
        otrosPagosLaborales: 14360000,
        indemnizacionesDespido: 0,
        subsidiosAuxilios: 0,
        viaticos: 0,
        honorariosSinCostos: 0,
        compensacionServiciosSinCostos: 0,
        pagosAlimentacion: 0,
        gastosRepresentacion: 0,
        ingresosExterior: 0,
      },
      incrngo: { saludObligatoria: 3272000, pensionObligatoria: 4091000, fondoSolidaridadPensional: 0, aportesVoluntariosRAIS: 0, apoyosEducativos: 0, otros: 0 },
      deducciones: { medicinaPrepagada: 0, interesesVivienda: 3503000, gmfCertificado: 315000, interesesIcetex: 0, otras: 0 },
      rentasExentasLimitadas: {},
      rentasExentasNoLimitadas: {},
      afcPensionVoluntaria: 2300000,
    },
    ctxComun
  );

  const honorarios = {
    ingresosBrutos: 0,
    incrngo: 0,
    costosDeducciones: 0,
    rentaLiquida: 0,
    deduccionesImputablesSinDependientes: 0,
    rentasExentasNoLimitadas: 0,
    baseExentasYDeduccionesLimitadas: 0,
  };

  const capital = calcularCedulaCapital(
    {
      ingresos: {
        intereses: 0,
        interesesParticulares: 0,
        descuentosTitulos: 0,
        colaboracionEmpresarial: 0,
        rendimientosEntidadesFinancieras: 2300000,
        rendimientosTitulosDeudaPublica: 0,
        bonosPapelesComerciales: 0,
        fondosInversionColectiva: 0,
        rendimientosPensiones: 1667000,
        rendimientosCesantias: 0,
        rendimientosAFC: 0,
        arrendamientos: 2438500,
        regalias: 0,
        propiedadIntelectual: 0,
        ingresosExterior: 0,
        otros: 0,
      },
      afcPensionVoluntaria: 0,
      viviendaDigitado: 0,
      icetexDigitado: 0,
    },
    { uvt, componenteInflacionarioTasa: 0.5088, viviendaDisponible: 1200 * uvt, icetexDisponible: 100 * uvt }
  );

  const noLaboral = calcularCedulaNoLaboral(
    {
      ingresos: {
        honorarios2omastrabajadores: 0,
        compensacionServicios2omastrabajadores: 1200000,
        contratosPrestacionServicios: 0,
        ventasMercancia: 0,
        ventasActividades: 0,
        ventasInventarios: 0,
        ventasActivosBiologicos: 0,
        construccion: 0,
        apoyosEducativos: 0,
        gananciales: 0,
        indemnizacionDanoEmergente: 0,
        indemnizacionLucroCesante: 0,
        indemnizacionSegurosDistintosVida: 0,
        retiroPensionSinPermanencia: 0,
        retiroAfcSinPermanencia: 0,
        ventaInmuebles: 0,
        ventaInversiones: 0,
        ventaActivosFijos: 0,
        colaboracionEmpresarial: 0,
        ingresosCAN: 0,
        ingresosExterior: 0,
        otros: 0,
      },
      devolucionesRebajas: 0,
      costosYGastos: 0,
      afcPensionVoluntaria: 0,
      viviendaDigitado: 0,
      icetexDigitado: 0,
    },
    { uvt, viviendaDisponible: 1200 * uvt, icetexDisponible: 100 * uvt }
  );

  const resultado = calcularFormulario210({
    uvt,
    cedulas: [trabajo, honorarios, capital, noLaboral],
    pensiones: pensionesVacias,
    dividendos: dividendosVacios,
    gananciaOcasional: gananciaOcasionalVacia,
    numeroDependientesArt336: 0,
    comprasConFacturaElectronica: 179303520, // DATOS INICIALES!D45 del caso real
    patrimonio: { patrimonioBruto: 6370000, deudas: 9943000, patrimonioLiquido: 0 },
    patrimonioLiquidoAnioAnterior: 0,
    impuestosYAnticiposPagadosAnioGravable: 0,
    rentaPorComparacionPatrimonialManual: 0,
    descuentosTributariosDigitados: 0,
    retencionesPracticadas: 775506,
    impuestoNetoAnioAnterior: 1620000,
    anticipoAnioAnterior: 700000,
    saldoAFavorAnioAnteriorSinSolicitud: 0,
    antiguedadDeclarante: 'terceroYSiguientes',
  });

  it('casilla 91 (renta líquida cédula general) ~ 108.067.000 del .xlsm', () => {
    expect(Math.abs(resultado.casillas[91] - 108067000)).toBeLessThan(TOLERANCIA_PESOS);
  });

  it('desglose por cédula (32/33/34, 58/59, 74) coincide con los ingresos/incrngo digitados', () => {
    expect(resultado.casillas[32]).toBe(108994000); // trabajo ingresos brutos
    expect(resultado.casillas[33]).toBe(7363000); // trabajo INCRNGO
    expect(resultado.casillas[34]).toBe(101631000); // trabajo renta líquida
    expect(resultado.casillas[58]).toBe(6406000); // capital ingresos brutos
    expect(resultado.casillas[74]).toBe(1200000); // no laboral ingresos brutos
  });

  it('casilla 41 (rentas exentas/deducciones limitadas de trabajo) ~ casilla 37 + 40 cuando no hay tope', () => {
    // Tolerancia por la misma razón que el resto del archivo: 41 redondea
    // el total una sola vez, 37+40 suma dos sub-componentes YA redondeados
    // por separado — pueden diferir en un par de miles de pesos (Art. 577 ET).
    expect(Math.abs(resultado.casillas[41] - (resultado.casillas[37] + resultado.casillas[40]))).toBeLessThan(TOLERANCIA_PESOS);
  });

  it('casilla 97/111 (renta líquida gravable) ~ 71.013.000 del .xlsm', () => {
    expect(Math.abs(resultado.casillas[97] - 71013000)).toBeLessThan(TOLERANCIA_PESOS);
    expect(resultado.casillas[111]).toBe(resultado.casillas[97]);
  });

  it('casilla 116/121 (impuesto básico, tabla Art. 241 ET) = 3.745.000, igual al .xlsm', () => {
    expect(resultado.casillas[116]).toBe(3745000);
  });

  it('casilla 126 (impuesto neto de renta) ~ 3.745.000 del .xlsm (sin descuentos digitados)', () => {
    expect(Math.abs(resultado.casillas[126] - 3745000)).toBeLessThan(TOLERANCIA_PESOS);
  });

  it('casilla 29/30/31 (patrimonio) igual al .xlsm', () => {
    expect(resultado.casillas[29]).toBe(6370000);
    expect(resultado.casillas[30]).toBe(9943000);
    expect(resultado.casillas[31]).toBe(0);
  });

  it('no hay renta por comparación patrimonial cuando no se digita manualmente', () => {
    expect(resultado.casillas[96]).toBe(0);
  });

  it('casilla 133 (anticipo año siguiente, Art. 807 ET) = 1.236.000, igual al .xlsm', () => {
    expect(resultado.casillas[133]).toBe(1236000);
  });

  it('casilla 134 (saldo a pagar) es coherente: 129+133-130-131-132', () => {
    const c = resultado.casillas;
    expect(c[134]).toBe(Math.max(0, c[129] + c[133] - c[130] - c[131] - c[132]));
  });
});

describe('calcularFormulario210 — Fase 4: pensiones, dividendos y ganancia ocasional integrados', () => {
  const uvt = 47065;

  const trabajoVacio = calcularCedulaTrabajo(
    {
      ingresos: Object.fromEntries(
        ['salarios', 'cesantiasPagadas', 'cesantiasFondo', 'cesantiasPre2017', 'prestacionesSociales', 'primasExtralegales', 'comisionesBonificaciones', 'otrosPagosLaborales', 'indemnizacionesDespido', 'subsidiosAuxilios', 'viaticos', 'honorariosSinCostos', 'compensacionServiciosSinCostos', 'pagosAlimentacion', 'gastosRepresentacion', 'ingresosExterior'].map((k) => [k, 0])
      ),
      incrngo: { saludObligatoria: 0, pensionObligatoria: 0, fondoSolidaridadPensional: 0, aportesVoluntariosRAIS: 0, apoyosEducativos: 0, otros: 0 },
      deducciones: { medicinaPrepagada: 0, interesesVivienda: 0, gmfCertificado: 0, interesesIcetex: 0, otras: 0 },
      rentasExentasLimitadas: {},
      rentasExentasNoLimitadas: {},
      afcPensionVoluntaria: 0,
    },
    { uvt, ingresoMensualPromedio6m: 0, mesesTrabajados: 12 }
  );
  const honorariosVacio = {
    ingresosBrutos: 0, incrngo: 0, costosDeducciones: 0, rentaLiquida: 0,
    deduccionesImputablesSinDependientes: 0, rentasExentasNoLimitadas: 0, baseExentasYDeduccionesLimitadas: 0,
  };
  const capitalVacio = calcularCedulaCapital(
    { ingresos: Object.fromEntries(['intereses', 'rendimientosEntidadesFinancieras', 'rendimientosTitulosDeudaPublica', 'fondosInversionColectiva', 'rendimientosPensiones', 'rendimientosCesantias', 'rendimientosAFC', 'arrendamientos', 'regalias', 'propiedadIntelectual', 'ingresosExterior', 'otros'].map((k) => [k, 0])), afcPensionVoluntaria: 0, viviendaDigitado: 0, icetexDigitado: 0 },
    { uvt, componenteInflacionarioTasa: 0.5088, viviendaDisponible: 1200 * uvt, icetexDisponible: 100 * uvt }
  );
  const noLaboralVacio = calcularCedulaNoLaboral(
    { ingresos: Object.fromEntries(['honorarios2omastrabajadores', 'compensacionServicios2omastrabajadores', 'contratosPrestacionServicios', 'ventasMercancia', 'ventasActividades', 'ventasInventarios', 'ventasActivosBiologicos', 'construccion', 'apoyosEducativos', 'gananciales', 'indemnizacionDanoEmergente', 'indemnizacionLucroCesante', 'indemnizacionSegurosDistintosVida', 'retiroPensionSinPermanencia', 'retiroAfcSinPermanencia', 'ventaInmuebles', 'ventaInversiones', 'ventaActivosFijos', 'colaboracionEmpresarial', 'ingresosCAN', 'ingresosExterior', 'otros'].map((k) => [k, 0])), devolucionesRebajas: 0, costosYGastos: 0, afcPensionVoluntaria: 0, viviendaDigitado: 0, icetexDigitado: 0 },
    { uvt, viviendaDisponible: 1200 * uvt, icetexDisponible: 100 * uvt }
  );

  // Pensión por encima del tope de 12.000 UVT (564.780.000) para que quede
  // renta líquida gravable > 0. Dividendo subcédula 2 (tarifa plana 35%).
  // Lotería (tarifa plana 20%).
  const pensiones = calcularCedulaPensiones(
    {
      ingresos: { jubilacion: 600000000, invalidez: 0, vejez: 0, sobrevivientes: 0, riesgosProfesionales: 0, indemnizacionesSustitutivas: 0, devolucionSaldosAhorro: 0 },
      ingresosExterior: { sinConvenioJubilacionEtc: 0, sinConvenioOtras: 0, demasPaisesJubilacionEtc: 0, demasPaisesOtras: 0, canJubilacionEtc: 0, canOtras: 0 },
      incrngo: { saludObligatoria: 0, fondoSolidaridadPensional: 0, indemnizaciones: 0, otros: 0 },
      afcPensionVoluntaria: 0,
    },
    { uvt }
  );
  const dividendos = calcularCedulaDividendos({
    anio2016yAnteriores: { dividendosNoGravados: 0, dividendosGravados: 0, capitalizacionesNoGravadas: 0, capitalizacionesGravadas: 0, distribucionEceNoGravados: 0, distribucionEceGravados: 0 },
    subcedula1NoGravados: 0,
    subcedula2Gravados: 10000000,
    rentaLiquidaPasivaExterior: 0,
    rentaExentaExterior: 0,
  });
  const gananciaOcasional = calcularGananciaOcasional(
    {
      ingresos: { ventaActivosFijos2AniosOMas: 0, ventaAcciones2AniosOMas: 0, porcionConyugal: 0, liquidacionSociedades: 0, herencia: 0, legados: 0, indemnizacionSegurosVida: 0, donacionesInterVivos: 0 },
      loteriasRifas: 5000000,
      gananciasExterior: 0,
      costos: { costoVentaActivosFijos: 0, costoVentaAcciones: 0 },
      exentas: { ventaCasaAntes1987: 0, viviendaCausante: 0, inmuebleCausante: 0, herenciaLegado: 0, bienesTerceros: 0, librosRopaMobiliario: 0, ventaCasaHabitual: 0, accionesBVC: 0, exteriorEce: 0, otras: 0 },
    },
    { uvt }
  );

  const resultado = calcularFormulario210({
    uvt,
    cedulas: [trabajoVacio, honorariosVacio, capitalVacio, noLaboralVacio],
    pensiones,
    dividendos,
    gananciaOcasional,
    numeroDependientesArt336: 0,
    comprasConFacturaElectronica: 0,
    patrimonio: { patrimonioBruto: 0, deudas: 0, patrimonioLiquido: 0 },
    patrimonioLiquidoAnioAnterior: 0,
    impuestosYAnticiposPagadosAnioGravable: 0,
    rentaPorComparacionPatrimonialManual: 0,
    descuentosTributariosDigitados: 0,
    retencionesPracticadas: 0,
    impuestoNetoAnioAnterior: 0,
    anticipoAnioAnterior: 0,
    saldoAFavorAnioAnteriorSinSolicitud: 0,
    antiguedadDeclarante: 'terceroYSiguientes',
  });

  it('casilla 103 (renta líquida gravable pensiones) = ingreso - exceso del tope de 12.000 UVT', () => {
    expect(resultado.casillas[103]).toBe(600000000 - 12000 * uvt);
  });

  it('casilla 118 (impuesto subcédula 2 dividendos, tarifa plana 35%)', () => {
    expect(resultado.casillas[118]).toBe(3500000);
  });

  it('casilla 127 (impuesto ganancia ocasional, tarifa plana 20% loterías)', () => {
    expect(resultado.casillas[127]).toBe(1000000);
  });

  it('casilla 111 incluye pensiones + remanente subcédula 2 (post 35%), NO la ganancia ocasional', () => {
    const remanenteSubcedula2 = 10000000 - 3500000;
    expect(resultado.casillas[111]).toBe(resultado.casillas[97] + resultado.casillas[103] + remanenteSubcedula2);
  });

  it('casilla 121 = 116 + 118 (117/119/120 en 0 en este caso)', () => {
    expect(resultado.casillas[121]).toBe(resultado.casillas[116] + resultado.casillas[118]);
  });

  it('casilla 129 = 126 + 127 (impuesto neto + impuesto ganancia ocasional)', () => {
    expect(resultado.casillas[129]).toBe(resultado.casillas[126] + resultado.casillas[127]);
  });
});
