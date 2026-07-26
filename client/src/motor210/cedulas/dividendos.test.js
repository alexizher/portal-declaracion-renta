import { describe, it, expect } from 'vitest';
import { calcularCedulaDividendos } from './dividendos.js';

function input(overrides = {}) {
  return {
    anio2016yAnteriores: {
      dividendosNoGravados: 0,
      dividendosGravados: 0,
      capitalizacionesNoGravadas: 0,
      capitalizacionesGravadas: 0,
      distribucionEceNoGravados: 0,
      distribucionEceGravados: 0,
    },
    subcedula1NoGravados: 0,
    subcedula2Gravados: 0,
    rentaLiquidaPasivaExterior: 0,
    rentaExentaExterior: 0,
    ...overrides,
  };
}

describe('calcularCedulaDividendos', () => {
  it('dividendos 2016 y anteriores: renta líquida = total - lo NO gravado (INCRNGO)', () => {
    const r = calcularCedulaDividendos(
      input({
        anio2016yAnteriores: { ...input().anio2016yAnteriores, dividendosNoGravados: 1000000, dividendosGravados: 2000000 },
      })
    );
    expect(r.rentaLiquida2016).toBe(2000000);
  });

  it('subcédula 1 y 2 pasan directo (sin tope) a su propia renta líquida cedular', () => {
    const r = calcularCedulaDividendos(input({ subcedula1NoGravados: 5000000, subcedula2Gravados: 8000000 }));
    expect(r.rentaLiquidaSubcedula1).toBe(5000000);
    expect(r.rentaLiquidaSubcedula2).toBe(8000000);
  });

  it('dividendos del exterior: renta líquida pasiva menos la exenta asociada', () => {
    const r = calcularCedulaDividendos(input({ rentaLiquidaPasivaExterior: 3000000, rentaExentaExterior: 1000000 }));
    expect(r.rentaLiquidaExterior).toBe(2000000);
  });

  it('total gravable = suma de los 4 bloques', () => {
    const r = calcularCedulaDividendos(
      input({
        anio2016yAnteriores: { ...input().anio2016yAnteriores, dividendosGravados: 2000000 },
        subcedula1NoGravados: 5000000,
        subcedula2Gravados: 8000000,
        rentaLiquidaPasivaExterior: 3000000,
        rentaExentaExterior: 1000000,
      })
    );
    expect(r.rentaLiquidaGravableTotal).toBe(2000000 + 5000000 + 8000000 + 2000000);
  });
});
