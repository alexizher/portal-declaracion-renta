import { describe, it, expect } from 'vitest';
import { calcularValorActivoConReajuste, totalActivosConReajuste } from './reajusteFiscal.js';

const ctx = { anioGravable: 2024, tasaReajusteFiscal: 0.1097 };

function activo(overrides = {}) {
  return {
    tipo: 'inmuebleUrbano',
    anioAdquisicion: 2016,
    valorAdquisicion: 0,
    valorDeclaradoAnioAnterior: 0,
    mejorasYValorizaciones: 0,
    aplicaReajusteFiscal: false,
    aplicaArt73: false,
    valorCatastralOAvaluo: 0,
    ...overrides,
  };
}

describe('calcularValorActivoConReajuste', () => {
  it('Art. 73 ET: factor de la tabla × costo histórico (inmueble urbano, 2016)', () => {
    const r = calcularValorActivoConReajuste(
      activo({ anioAdquisicion: 2016, valorAdquisicion: 100000000, aplicaArt73: true }),
      ctx
    );
    expect(r.ajusteArt73).toBe(100000000 * 1.54);
    expect(r.valorPatrimonial).toBe(100000000 * 1.54);
  });

  it('el Art. 73 ET NUNCA aplica a vehículos, aunque aplicaArt73 esté en true', () => {
    const r = calcularValorActivoConReajuste(
      activo({ tipo: 'vehiculo', anioAdquisicion: 2016, valorAdquisicion: 100000000, aplicaArt73: true }),
      ctx
    );
    expect(r.ajusteArt73).toBe(0);
  });

  it('reajuste fiscal anual: usa el valor declarado el año anterior si NO se compró este año', () => {
    const r = calcularValorActivoConReajuste(
      activo({
        tipo: 'vehiculo',
        anioAdquisicion: 2020,
        valorAdquisicion: 80000000,
        valorDeclaradoAnioAnterior: 75000000,
        aplicaReajusteFiscal: true,
        valorCatastralOAvaluo: 90000000,
      }),
      ctx
    );
    expect(r.costoFiscalAjustado).toBeCloseTo(75000000 + 75000000 * 0.1097, 6);
    // El avalúo (90M) es mayor que el costo fiscal ajustado (~83.2M) — gana el avalúo.
    expect(r.valorPatrimonial).toBe(90000000);
  });

  it('reajuste fiscal anual: usa el costo de adquisición si se compró ESTE año gravable', () => {
    const r = calcularValorActivoConReajuste(
      activo({ anioAdquisicion: 2024, valorAdquisicion: 50000000, aplicaReajusteFiscal: true }),
      ctx
    );
    const esperado = 50000000 + 50000000 * 0.1097;
    expect(r.costoFiscalAjustado).toBeCloseTo(esperado, 6);
    expect(r.valorPatrimonial).toBeCloseTo(esperado, 6);
  });

  it('toma el mayor entre reajuste fiscal, Art. 73 y catastral/avalúo', () => {
    const r = calcularValorActivoConReajuste(
      activo({
        anioAdquisicion: 2016,
        valorAdquisicion: 100000000,
        valorDeclaradoAnioAnterior: 100000000,
        aplicaReajusteFiscal: true,
        aplicaArt73: true,
        valorCatastralOAvaluo: 120000000,
      }),
      ctx
    );
    // Art. 73 (154M) > catastral (120M) > reajuste fiscal (~110.97M)
    expect(r.valorPatrimonial).toBe(100000000 * 1.54);
  });

  it('sin ningún método activado, el valor patrimonial es el costo/valor base sin ajustar', () => {
    const r = calcularValorActivoConReajuste(activo({ valorDeclaradoAnioAnterior: 60000000 }), ctx);
    expect(r.valorPatrimonial).toBe(60000000);
  });
});

describe('totalActivosConReajuste', () => {
  it('suma el valor patrimonial de varios activos', () => {
    const total = totalActivosConReajuste(
      [
        activo({ anioAdquisicion: 2016, valorAdquisicion: 100000000, aplicaArt73: true }),
        activo({ tipo: 'vehiculo', valorDeclaradoAnioAnterior: 30000000 }),
      ],
      ctx
    );
    expect(total).toBe(100000000 * 1.54 + 30000000);
  });

  it('lista vacía o undefined da 0', () => {
    expect(totalActivosConReajuste([], ctx)).toBe(0);
    expect(totalActivosConReajuste(undefined, ctx)).toBe(0);
  });
});
