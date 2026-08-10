import { describe, it, expect } from 'vitest';
import { calcularCedulaCapital } from './capital.js';

// Mismo cliente anonimizado del caso dorado de trabajo.test.js — cifras de
// capital reales de CED.1 GENERAL (columnas H/I), AG2024.
describe('calcularCedulaCapital — caso dorado (cliente real AG2024, anonimizado)', () => {
  const input = {
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
  };
  const ctx = {
    uvt: 47065,
    componenteInflacionarioTasa: 0.5088,
    viviendaDisponible: 1200 * 47065,
    icetexDisponible: 100 * 47065,
  };
  const resultado = calcularCedulaCapital(input, ctx);

  it('ingresos brutos = suma de rendimientos', () => {
    expect(resultado.ingresosBrutos).toBe(6405500);
  });

  it('INCRNGO = componente inflacionario solo sobre entidades vigiladas (no pensiones/AFC)', () => {
    expect(resultado.incrngo).toBe(1170240);
  });

  it('renta líquida coincide con el .xlsm (5.235.260)', () => {
    expect(resultado.rentaLiquida).toBe(5235260);
  });

  it('sin costosYGastos, costosDeducciones es 0 (compatibilidad hacia atrás)', () => {
    expect(resultado.costosDeducciones).toBe(0);
  });
});

describe('calcularCedulaCapital — costos y gastos procedentes (Fase 3)', () => {
  const ingresosBase = {
    intereses: 0,
    interesesParticulares: 0,
    descuentosTitulos: 0,
    colaboracionEmpresarial: 0,
    rendimientosEntidadesFinancieras: 0,
    rendimientosTitulosDeudaPublica: 0,
    bonosPapelesComerciales: 0,
    fondosInversionColectiva: 0,
    rendimientosPensiones: 0,
    rendimientosCesantias: 0,
    rendimientosAFC: 0,
    arrendamientos: 10000000,
    regalias: 0,
    propiedadIntelectual: 0,
    ingresosExterior: 0,
    otros: 0,
  };
  const ctx = {
    uvt: 47065,
    componenteInflacionarioTasa: 0.5088,
    componenteInflacionarioGastosTasa: 0.2501,
    viviendaDisponible: 1200 * 47065,
    icetexDisponible: 100 * 47065,
  };

  it('suma las líneas de costos y las resta de la renta líquida', () => {
    const input = {
      ingresos: ingresosBase,
      costosYGastos: { impuestoPredial: 500000, seguros: 300000 },
      afcPensionVoluntaria: 0,
      viviendaDigitado: 0,
      icetexDigitado: 0,
    };
    const r = calcularCedulaCapital(input, ctx);
    expect(r.costosDeducciones).toBe(800000);
    expect(r.rentaLiquida).toBe(10000000 - 800000);
  });

  it('"gastos financieros" se ajusta por su propio componente inflacionario antes de sumarse', () => {
    const input = {
      ingresos: ingresosBase,
      costosYGastos: { gastosFinancieros: 1000000 },
      afcPensionVoluntaria: 0,
      viviendaDigitado: 0,
      icetexDigitado: 0,
    };
    const r = calcularCedulaCapital(input, ctx);
    expect(r.costosDeducciones).toBe(1000000 * (1 - 0.2501));
  });

  it('sin componenteInflacionarioGastosTasa en ctx, no rompe (usa 0, deducción completa)', () => {
    const input = {
      ingresos: ingresosBase,
      costosYGastos: { gastosFinancieros: 1000000 },
      afcPensionVoluntaria: 0,
      viviendaDigitado: 0,
      icetexDigitado: 0,
    };
    const r = calcularCedulaCapital(input, { ...ctx, componenteInflacionarioGastosTasa: undefined });
    expect(r.costosDeducciones).toBe(1000000);
    expect(Number.isNaN(r.costosDeducciones)).toBe(false);
  });
});
