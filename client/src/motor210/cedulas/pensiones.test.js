import { describe, it, expect } from 'vitest';
import { calcularCedulaPensiones } from './pensiones.js';

const ctx = { uvt: 47065 };

function input(overrides = {}) {
  return {
    ingresos: {
      jubilacion: 0,
      invalidez: 0,
      vejez: 0,
      sobrevivientes: 0,
      riesgosProfesionales: 0,
      indemnizacionesSustitutivas: 0,
      devolucionSaldosAhorro: 0,
    },
    ingresosExterior: {
      sinConvenioJubilacionEtc: 0,
      sinConvenioOtras: 0,
      demasPaisesJubilacionEtc: 0,
      demasPaisesOtras: 0,
      canJubilacionEtc: 0,
      canOtras: 0,
    },
    incrngo: { saludObligatoria: 0, fondoSolidaridadPensional: 0, indemnizaciones: 0, otros: 0 },
    afcPensionVoluntaria: 0,
    ...overrides,
  };
}

describe('calcularCedulaPensiones', () => {
  it('pensión nacional simple: exenta hasta 12.000 UVT (Art. 206 núm. 5 ET)', () => {
    const r = calcularCedulaPensiones(
      input({
        ingresos: { ...input().ingresos, jubilacion: 50000000 },
        incrngo: { saludObligatoria: 2000000, fondoSolidaridadPensional: 500000, indemnizaciones: 0, otros: 0 },
        afcPensionVoluntaria: 3000000,
      }),
      ctx
    );
    expect(r.ingresosBrutos).toBe(50000000);
    expect(r.incrngo).toBe(2500000);
    expect(r.rentaLiquida).toBe(47500000);
    expect(r.pensionesExentasPais).toBe(47500000);
    expect(r.afcPensionLimitada).toBe(3000000);
    expect(r.rentaLiquidaGravable).toBe(0);
  });

  it('pensión del exterior "sin convenio" NO tiene exención (a diferencia de CAN y demás países)', () => {
    const r = calcularCedulaPensiones(
      input({ ingresosExterior: { ...input().ingresosExterior, sinConvenioJubilacionEtc: 20000000 } }),
      ctx
    );
    expect(r.ingresosBrutos).toBe(20000000);
    expect(r.totalRentasExentas).toBe(0);
    expect(r.rentaLiquidaGravable).toBe(20000000);
  });

  it('pensión de países CAN es exenta sin límite', () => {
    const r = calcularCedulaPensiones(
      input({ ingresosExterior: { ...input().ingresosExterior, canJubilacionEtc: 900000000 } }),
      ctx
    );
    expect(r.pensionesExentasCAN).toBe(900000000);
    expect(r.rentaLiquidaGravable).toBe(0);
  });

  it('pensión de otros países extranjeros topada a 12.000 UVT', () => {
    const r = calcularCedulaPensiones(
      input({ ingresosExterior: { ...input().ingresosExterior, demasPaisesJubilacionEtc: 900000000 } }),
      ctx
    );
    expect(r.pensionesExentasExterior).toBe(12000 * ctx.uvt);
    expect(r.rentaLiquidaGravable).toBe(900000000 - 12000 * ctx.uvt);
  });

  it('renta líquida gravable nunca es negativa', () => {
    const r = calcularCedulaPensiones(input(), ctx);
    expect(r.rentaLiquidaGravable).toBe(0);
  });
});
