import { describe, it, expect } from 'vitest';
import { liquidar } from './index.js';

const CONCEPTOS_NO_LABORAL_VACIOS = {
  honorarios2omastrabajadores: 0,
  compensacionServicios2omastrabajadores: 0,
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
};

// Pensiones/dividendos/ganancia ocasional en 0 — el caso dorado (cliente
// real anonimizado) no tenía ninguna de estas 3, así que no deben mover
// ninguna de las cifras ya validadas contra el .xlsm.
const PENSIONES_VACIAS = {
  ingresos: { jubilacion: 0, invalidez: 0, vejez: 0, sobrevivientes: 0, riesgosProfesionales: 0, indemnizacionesSustitutivas: 0, devolucionSaldosAhorro: 0 },
  ingresosExterior: { sinConvenioJubilacionEtc: 0, sinConvenioOtras: 0, demasPaisesJubilacionEtc: 0, demasPaisesOtras: 0, canJubilacionEtc: 0, canOtras: 0 },
  incrngo: { saludObligatoria: 0, fondoSolidaridadPensional: 0, indemnizaciones: 0, otros: 0 },
  afcPensionVoluntaria: 0,
};

const DIVIDENDOS_VACIOS = {
  anio2016yAnteriores: { dividendosNoGravados: 0, dividendosGravados: 0, capitalizacionesNoGravadas: 0, capitalizacionesGravadas: 0, distribucionEceNoGravados: 0, distribucionEceGravados: 0 },
  subcedula1NoGravados: 0,
  subcedula2Gravados: 0,
  rentaLiquidaPasivaExterior: 0,
  rentaExentaExterior: 0,
};

const GANANCIA_OCASIONAL_VACIA = {
  ingresos: { ventaActivosFijos2AniosOMas: 0, ventaAcciones2AniosOMas: 0, porcionConyugal: 0, liquidacionSociedades: 0, herencia: 0, legados: 0, indemnizacionSegurosVida: 0, donacionesInterVivos: 0 },
  loteriasRifas: 0,
  gananciasExterior: 0,
  costos: { costoVentaActivosFijos: 0, costoVentaAcciones: 0 },
  exentas: { ventaCasaAntes1987: 0, viviendaCausante: 0, inmuebleCausante: 0, herenciaLegado: 0, bienesTerceros: 0, librosRopaMobiliario: 0, ventaCasaHabitual: 0, accionesBVC: 0, exteriorEce: 0, otras: 0 },
};

// Caso dorado completo orquestado por liquidar() — mismo cliente real
// anonimizado usado en los tests de cada módulo por separado.
describe('liquidar — orquestación completa del caso dorado', () => {
  const resultado = liquidar({
    uvt: 47065,
    mesesTrabajados: 12,
    ingresoMensualPromedio6m: 7266000,
    componenteInflacionarioTasa: 0.5088,
    trabajo: {
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
    honorarios: {
      ingresos: { honorarios: 0, compensacionServicios: 0, comisionesBonificaciones: 0, ingresosExterior: 0, otros: 0 },
      costosYGastos: 0,
      afcPensionVoluntaria: 0,
      medicinaDigitado: 0,
      viviendaDigitado: 0,
      icetexDigitado: 0,
    },
    capital: {
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
    noLaboral: {
      ingresos: { ...CONCEPTOS_NO_LABORAL_VACIOS, compensacionServicios2omastrabajadores: 1200000 },
      devolucionesRebajas: 0,
      costosYGastos: 0,
      afcPensionVoluntaria: 0,
      viviendaDigitado: 0,
      icetexDigitado: 0,
    },
    pensiones: PENSIONES_VACIAS,
    dividendos: DIVIDENDOS_VACIOS,
    gananciaOcasional: GANANCIA_OCASIONAL_VACIA,
    tieneDependienteArt387: false,
    numeroDependientesArt336: 0,
    comprasConFacturaElectronica: 179303520,
    activosPatrimonio: { efectivo: 0, inversiones: 0, cuentasPorCobrar: 0, inventarios: 0, activosFijosInmuebles: 0, vehiculos: 0, otros: 6370000 },
    deudasPatrimonio: 9943000,
    patrimonioLiquidoAnioAnterior: 0,
    impuestosYAnticiposPagadosAnioGravable: 0,
    descuentosTributariosDigitados: 0,
    retencionesPracticadas: 775506,
    impuestoNetoAnioAnterior: 1620000,
    anticipoAnioAnterior: 700000,
    saldoAFavorAnioAnteriorSinSolicitud: 0,
    antiguedadDeclarante: 'terceroYSiguientes',
    incluirComparacionPatrimonial: false,
  });

  it('impuesto neto de renta (casilla 126) = 3.745.000, igual al .xlsm', () => {
    expect(resultado.casillas[126]).toBe(3745000);
  });

  it('anticipo (casilla 133) = 1.236.000, igual al .xlsm', () => {
    expect(resultado.casillas[133]).toBe(1236000);
  });

  it('expone intermedios.anticipoCalc (usado por PasoAnticipo.jsx) con el detalle método 1 vs método 2', () => {
    expect(resultado.intermedios.anticipoCalc).toBeDefined();
    expect(resultado.intermedios.anticipoCalc.anticipo).toBe(1236000);
    expect([1, 2]).toContain(resultado.intermedios.anticipoCalc.metodoUsado);
  });

  it('patrimonio líquido (casilla 31) = 0, igual al .xlsm', () => {
    expect(resultado.casillas[31]).toBe(0);
  });

  it('no arroja advertencia de comparación patrimonial cuando el patrimonio no creció', () => {
    expect(resultado.advertencias.some((a) => a.includes('comparación patrimonial'))).toBe(false);
  });
});
