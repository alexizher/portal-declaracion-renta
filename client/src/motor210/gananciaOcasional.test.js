import { describe, it, expect } from 'vitest';
import { calcularGananciaOcasional } from './gananciaOcasional.js';

const ctx = { uvt: 47065 };

function input(overrides = {}) {
  return {
    ingresos: {
      ventaActivosFijos2AniosOMas: 0,
      ventaAcciones2AniosOMas: 0,
      porcionConyugal: 0,
      liquidacionSociedades: 0,
      herencia: 0,
      legados: 0,
      indemnizacionSegurosVida: 0,
      donacionesInterVivos: 0,
    },
    loteriasRifas: 0,
    gananciasExterior: 0,
    costos: { costoVentaActivosFijos: 0, costoVentaAcciones: 0 },
    exentas: {
      ventaCasaAntes1987: 0,
      viviendaCausante: 0,
      inmuebleCausante: 0,
      herenciaLegado: 0,
      bienesTerceros: 0,
      librosRopaMobiliario: 0,
      ventaCasaHabitual: 0,
      accionesBVC: 0,
      exteriorEce: 0,
      otras: 0,
    },
    ...overrides,
  };
}

describe('calcularGananciaOcasional', () => {
  it('loterías/rifas se gravan al 20% sobre el bruto, sin costos ni exenciones', () => {
    const r = calcularGananciaOcasional(input({ loteriasRifas: 10000000 }), ctx);
    expect(r.impuestoGananciaOcasional).toBe(2000000);
  });

  it('herencia con exención dentro del tope: renta gravable y tarifa 15% en 0', () => {
    const r = calcularGananciaOcasional(
      input({
        ingresos: { ...input().ingresos, herencia: 100000000 },
        exentas: { ...input().exentas, herenciaLegado: 100000000 },
      }),
      ctx
    );
    expect(r.gananciaOcasionalGravable).toBe(0);
    expect(r.impuestoGananciaOcasional).toBe(0);
  });

  it('exención de herencia/legado topada a 3.250 UVT', () => {
    const r = calcularGananciaOcasional(
      input({
        ingresos: { ...input().ingresos, herencia: 200000000 },
        exentas: { ...input().exentas, herenciaLegado: 200000000 },
      }),
      ctx
    );
    const tope = 3250 * ctx.uvt;
    expect(r.exentasAplicadas).toBe(tope);
    expect(r.impuestoGananciaOcasional).toBe(7056000);
  });

  it('exención de porción conyugal se deriva del ingreso ya digitado (sin campo aparte)', () => {
    const r = calcularGananciaOcasional(input({ ingresos: { ...input().ingresos, porcionConyugal: 50000000 } }), ctx);
    expect(r.gananciaOcasionalGravable).toBe(0);
  });

  it('exención de donaciones = 20% del valor donado, topada a 1.625 UVT', () => {
    const r = calcularGananciaOcasional(input({ ingresos: { ...input().ingresos, donacionesInterVivos: 10000000 } }), ctx);
    expect(r.impuestoGananciaOcasional).toBe(1200000); // (10M - 2M exenta) * 15%
  });

  it('sin ningún ingreso, todo en 0', () => {
    const r = calcularGananciaOcasional(input(), ctx);
    expect(r.ingresosTotales).toBe(0);
    expect(r.impuestoGananciaOcasional).toBe(0);
  });
});
