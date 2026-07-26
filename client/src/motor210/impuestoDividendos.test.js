import { describe, it, expect } from 'vitest';
import { calcularImpuestoDividendos } from './impuestoDividendos.js';

const uvt = 47065;

function dividendos(overrides = {}) {
  return {
    rentaLiquida2016: 0,
    rentaLiquidaSubcedula1: 0,
    rentaLiquidaSubcedula2: 0,
    rentaLiquidaExterior: 0,
    ...overrides,
  };
}

describe('calcularImpuestoDividendos', () => {
  it('sin dividendos, todo en 0', () => {
    const r = calcularImpuestoDividendos(dividendos(), uvt);
    expect(r.impuestoDiv2016).toBe(0);
    expect(r.impuestoSubcedula2).toBe(0);
    expect(r.impuestoExterior).toBe(0);
    expect(r.remanenteSubcedula2ParaArt241).toBe(0);
    expect(r.descuentoDividendos).toBe(0);
  });

  it('dividendos del exterior/ECE: tarifa plana 35%, NO se suma a la tabla Art. 241 ni al descuento', () => {
    const r = calcularImpuestoDividendos(dividendos({ rentaLiquidaExterior: 10000000, rentaLiquidaSubcedula1: 5000000 }), uvt);
    expect(r.impuestoExterior).toBe(3500000);
    // 5.000.000 (subcédula1) / uvt = 106 UVT, por debajo del tope de 1.090 —
    // el descuento no ve el rentaLiquidaExterior en absoluto.
    expect(r.descuentoDividendos).toBe(0);
  });

  it('dividendos 2016 (1.190 UVT) — tramo 19% de la tabla grandfather', () => {
    const base = 1190 * uvt; // 100 UVT por encima del primer tramo (1.090)
    const r = calcularImpuestoDividendos(dividendos({ rentaLiquida2016: base }), uvt);
    expect(r.impuestoDiv2016).toBe(894000); // (1190-1090)*19%*uvt = 894.235 -> redondeado a miles
  });

  it('subcédula 2: tarifa plana 35%, el remanente sigue a la tabla Art. 241 ET', () => {
    const r = calcularImpuestoDividendos(dividendos({ rentaLiquidaSubcedula2: 10000000 }), uvt);
    expect(r.impuestoSubcedula2).toBe(3500000);
    expect(r.remanenteSubcedula2ParaArt241).toBe(6500000);
  });

  it('descuento Art. 254-1 ET: 0% hasta 1.090 UVT sobre (subcédula1 + remanente subcédula2), 19% en adelante', () => {
    // remanenteSubcedula2 = 10.000.000 - 3.500.000 = 6.500.000
    // baseDescuento = subcedula1 + remanente = 1.290 UVT exactos
    const subcedula1 = 1290 * uvt - 6500000;
    const r = calcularImpuestoDividendos(dividendos({ rentaLiquidaSubcedula1: subcedula1, rentaLiquidaSubcedula2: 10000000 }), uvt);
    expect(r.descuentoDividendos).toBe(1788000); // (1290-1090)*19%*uvt = 1.788.470 -> redondeado
  });

  it('descuento en 0 si la base no supera 1.090 UVT', () => {
    const r = calcularImpuestoDividendos(dividendos({ rentaLiquidaSubcedula1: 1000000 }), uvt);
    expect(r.descuentoDividendos).toBe(0);
  });
});
