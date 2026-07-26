import { describe, it, expect } from 'vitest';
import { impuestoArt241, detalleImpuestoArt241 } from './tablaImpuesto241.js';

const uvt = 47065;

describe('impuestoArt241', () => {
  it('sin impuesto por debajo de 1.090 UVT', () => {
    expect(impuestoArt241(1000 * uvt, uvt)).toBe(0);
  });

  it('impuesto correcto en el tramo del 19% (1.190 UVT)', () => {
    expect(impuestoArt241(1190 * uvt, uvt)).toBe(894000);
  });
});

describe('detalleImpuestoArt241', () => {
  it('expone el índice de tramo aplicado y la tarifa marginal', () => {
    const d = detalleImpuestoArt241(1190 * uvt, uvt);
    expect(d.tarifaMarginal).toBe(0.19);
    expect(d.tramos[d.indiceTramoAplicado].tarifa).toBe(0.19);
    expect(d.impuesto).toBe(894000);
  });

  it('base en 0 cae en el primer tramo (0%)', () => {
    const d = detalleImpuestoArt241(0, uvt);
    expect(d.indiceTramoAplicado).toBe(0);
    expect(d.tarifaMarginal).toBe(0);
    expect(d.impuesto).toBe(0);
  });

  it('base muy alta cae en el último tramo (39%)', () => {
    const d = detalleImpuestoArt241(50000 * uvt, uvt);
    expect(d.tarifaMarginal).toBe(0.39);
  });

  it('detalleImpuestoArt241(...).impuesto coincide siempre con impuestoArt241(...)', () => {
    for (const baseUvt of [0, 500, 1090, 1500, 5000, 10000, 20000, 40000]) {
      const base = baseUvt * uvt;
      expect(detalleImpuestoArt241(base, uvt).impuesto).toBe(impuestoArt241(base, uvt));
    }
  });
});
