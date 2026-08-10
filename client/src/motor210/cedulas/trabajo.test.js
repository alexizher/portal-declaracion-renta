import { describe, it, expect } from 'vitest';
import { calcularCedulaTrabajo } from './trabajo.js';

// Caso dorado: cifras reales de un cliente AG2024 extraídas de CED.1
// GENERAL (la hoja realmente usada del .xlsm de referencia), con nombre y
// cédula anonimizados — las cifras financieras y sus resultados esperados
// SÍ son reales, sirven para validar que el motor reproduce exactamente lo
// que la contadora ya presentó y confió el año pasado.
const CASO_ASALARIADO_SIMPLE = {
  input: {
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
    incrngo: {
      saludObligatoria: 3272000,
      pensionObligatoria: 4091000,
      fondoSolidaridadPensional: 0,
      aportesVoluntariosRAIS: 0,
      apoyosEducativos: 0,
      otros: 0,
    },
    deducciones: {
      medicinaPrepagada: 0,
      interesesVivienda: 3503000,
      gmfCertificado: 315000,
      interesesIcetex: 0,
      otras: 0,
    },
    rentasExentasLimitadas: {},
    rentasExentasNoLimitadas: {},
    afcPensionVoluntaria: 2300000,
  },
  ctx: {
    uvt: 47065, // UVT AG2024
    ingresoMensualPromedio6m: 7266000,
    mesesTrabajados: 12,
  },
};

describe('calcularCedulaTrabajo — caso dorado (cliente real AG2024, anonimizado)', () => {
  const resultado = calcularCedulaTrabajo(CASO_ASALARIADO_SIMPLE.input, CASO_ASALARIADO_SIMPLE.ctx);

  it('ingresos brutos = suma de todos los conceptos', () => {
    expect(resultado.ingresosBrutos).toBe(108994000);
  });

  it('INCRNGO = salud + pensión obligatorias', () => {
    expect(resultado.incrngo).toBe(7363000);
  });

  it('renta líquida = ingresos - INCRNGO', () => {
    expect(resultado.rentaLiquida).toBe(101631000);
  });

  it('deducciones imputables (vivienda + 50% GMF)', () => {
    expect(resultado.deduccionesImputablesSinDependientes).toBe(3660500);
  });

  it('cesantías 100% exentas (salario mensual < 350 UVT)', () => {
    expect(resultado.cesantiasExentasLimitadas).toBe(7125000);
  });

  it('AFC/pensión voluntaria dentro de los topes, sin recortar', () => {
    expect(resultado.afcPensionLimitada).toBe(2300000);
  });

  it('renta exenta 25% laboral (Art. 206 núm. 10 ET)', () => {
    expect(resultado.rentaExenta25).toBe(22175750);
  });

  it('total de la bolsa limitada (antes del tope 1.340 UVT) coincide con el .xlsm', () => {
    // E187 del .xlsm de referencia: 35.261.250
    expect(resultado.baseExentasYDeduccionesLimitadas).toBe(35261250);
  });
});

describe('calcularCedulaTrabajo — casos de borde', () => {
  const base = CASO_ASALARIADO_SIMPLE.input;
  const ctx = CASO_ASALARIADO_SIMPLE.ctx;

  it('salario mensual > 310 UVT excluye el beneficio de alimentación y advierte', () => {
    const input = {
      ...base,
      ingresos: { ...base.ingresos, salarios: 200000000, pagosAlimentacion: 500000 },
      incrngo: { ...base.incrngo },
    };
    const r = calcularCedulaTrabajo(input, ctx);
    expect(r.advertencias.length).toBeGreaterThan(0);
  });

  it('renta exenta 25% nunca supera el tope de 790 UVT', () => {
    const input = {
      ...base,
      ingresos: { ...base.ingresos, salarios: 500000000 },
      incrngo: { saludObligatoria: 0, pensionObligatoria: 0, fondoSolidaridadPensional: 0, aportesVoluntariosRAIS: 0, apoyosEducativos: 0, otros: 0 },
      deducciones: { medicinaPrepagada: 0, interesesVivienda: 0, gmfCertificado: 0, interesesIcetex: 0, otras: 0 },
      afcPensionVoluntaria: 0,
    };
    const r = calcularCedulaTrabajo(input, ctx);
    expect(r.rentaExenta25).toBe(790 * ctx.uvt);
  });

  it('rentaExenta25Manual sobrescribe el valor calculado y advierte', () => {
    const input = { ...base, rentaExenta25Manual: 5000000 };
    const r = calcularCedulaTrabajo(input, ctx);
    expect(r.rentaExenta25).toBe(5000000);
    expect(r.rentaExenta25Calculada).toBe(22175750);
    expect(r.advertencias.some((a) => a.includes('sobrescrita manualmente'))).toBe(true);
  });

  it('rentaExenta25Manual en null/undefined no altera el cálculo automático', () => {
    const r = calcularCedulaTrabajo({ ...base, rentaExenta25Manual: null }, ctx);
    expect(r.rentaExenta25).toBe(r.rentaExenta25Calculada);
    expect(r.advertencias.some((a) => a.includes('sobrescrita'))).toBe(false);
  });

  it('sin ingresos no hay renta líquida negativa', () => {
    const input = {
      ingresos: Object.fromEntries(Object.keys(base.ingresos).map((k) => [k, 0])),
      incrngo: { saludObligatoria: 0, pensionObligatoria: 0, fondoSolidaridadPensional: 0, aportesVoluntariosRAIS: 0, apoyosEducativos: 0, otros: 0 },
      deducciones: { medicinaPrepagada: 0, interesesVivienda: 0, gmfCertificado: 0, interesesIcetex: 0, otras: 0 },
      rentasExentasLimitadas: {},
      rentasExentasNoLimitadas: {},
      afcPensionVoluntaria: 0,
    };
    const r = calcularCedulaTrabajo(input, ctx);
    expect(r.rentaLiquida).toBe(0);
    expect(r.rentaExenta25).toBe(0);
  });
});

describe('calcularCedulaTrabajo — rentas exentas desglosadas (Fase 2)', () => {
  const base = CASO_ASALARIADO_SIMPLE.input;
  const ctx = CASO_ASALARIADO_SIMPLE.ctx;

  it('rentas exentas sujetas a limitación se suman a la bolsa limitada (y reducen la base del 25%, CED.1 GENERAL!D142)', () => {
    const sinDesglose = calcularCedulaTrabajo(base, ctx);
    const conDesglose = calcularCedulaTrabajo(
      { ...base, rentasExentasLimitadas: { ...base.rentasExentasLimitadas, gastosEntierroTrabajador: 1000000, economiaNaranja: 500000 } },
      ctx
    );
    // +1.500.000 directo a la bolsa, menos la reducción de la renta exenta
    // del 25% porque ahora también se resta de su base (25% × 1.500.000).
    const reduccionRentaExenta25 = sinDesglose.rentaExenta25 - conDesglose.rentaExenta25;
    expect(reduccionRentaExenta25).toBeCloseTo(1500000 * 0.25, 6);
    expect(conDesglose.baseExentasYDeduccionesLimitadas).toBeCloseTo(
      sinDesglose.baseExentasYDeduccionesLimitadas + 1500000 - reduccionRentaExenta25,
      6
    );
  });

  it('rentas exentas que NO se someten al límite se suman fuera de la bolsa limitada y afectan la base del 25%', () => {
    const sinDesglose = calcularCedulaTrabajo(base, ctx);
    const conDesglose = calcularCedulaTrabajo(
      { ...base, rentasExentasNoLimitadas: { ...base.rentasExentasNoLimitadas, ingresosCAN: 2000000 } },
      ctx
    );
    expect(conDesglose.rentasExentasNoLimitadas).toBe(sinDesglose.rentasExentasNoLimitadas + 2000000);
    // La base del 25% también resta las "no limitadas" (CED.1 GENERAL fila 142).
    expect(conDesglose.rentaExenta25).toBeLessThanOrEqual(sinDesglose.rentaExenta25);
  });
});
