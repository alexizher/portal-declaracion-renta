import { describe, it, expect } from 'vitest';
import { calcularRentaPorComparacionPatrimonial } from './comparacionPatrimonial.js';

function base(overrides = {}) {
  return {
    patrimonioLiquidoActual: 100000000,
    patrimonioLiquidoAnioAnterior: 100000000,
    rentaLiquidaGravable: 0,
    rentasExentasTotales: 0,
    incrngoTotal: 0,
    impuestosYAnticiposPagadosAnioGravable: 0,
    retencionesPracticadas: 0,
    ...overrides,
  };
}

describe('calcularRentaPorComparacionPatrimonial', () => {
  it('sin crecimiento patrimonial, no hay renta por comparación ni advertencia', () => {
    const r = calcularRentaPorComparacionPatrimonial(base());
    expect(r.rentaPorComparacion).toBe(0);
    expect(r.advertencias).toHaveLength(0);
  });

  it('la ganancia ocasional neta explica parte del crecimiento patrimonial (ya no es un hueco fuera de alcance)', () => {
    // Patrimonio creció 50M; sin ganancia ocasional, todo quedaría sin explicar.
    const sinGanancia = calcularRentaPorComparacionPatrimonial(
      base({ patrimonioLiquidoActual: 150000000 })
    );
    expect(sinGanancia.rentaPorComparacion).toBe(50000000);

    // Con 50M de ganancia ocasional neta (ej. herencia), el crecimiento queda explicado.
    const conGanancia = calcularRentaPorComparacionPatrimonial(
      base({ patrimonioLiquidoActual: 150000000, gananciaOcasionalNeta: 50000000 })
    );
    expect(conGanancia.rentaPorComparacion).toBe(0);
  });

  it('crecimiento patrimonial no explicado dispara advertencia', () => {
    const r = calcularRentaPorComparacionPatrimonial(base({ patrimonioLiquidoActual: 200000000 }));
    expect(r.rentaPorComparacion).toBe(100000000);
    expect(r.advertencias.some((a) => a.includes('comparación patrimonial'))).toBe(true);
  });
});
