import { describe, it, expect } from 'vitest';
import { calcularPatrimonio } from './patrimonio.js';

const CATEGORIAS_VACIAS = { efectivo: 0, inversiones: 0, cuentasPorCobrar: 0, inventarios: 0, activosFijosInmuebles: 0, vehiculos: 0, otros: 0 };

describe('calcularPatrimonio', () => {
  it('suma las categorías simples', () => {
    const r = calcularPatrimonio({ ...CATEGORIAS_VACIAS, efectivo: 1000000, otros: 500000 }, 0);
    expect(r.patrimonioBruto).toBe(1500000);
  });

  it('patrimonio líquido nunca es negativo', () => {
    const r = calcularPatrimonio({ ...CATEGORIAS_VACIAS, efectivo: 1000000 }, 5000000);
    expect(r.patrimonioLiquido).toBe(0);
  });

  it('suma el total de activos con reajuste fiscal ENCIMA de las categorías simples', () => {
    const sinReajuste = calcularPatrimonio({ ...CATEGORIAS_VACIAS, efectivo: 1000000 }, 0);
    const conReajuste = calcularPatrimonio({ ...CATEGORIAS_VACIAS, efectivo: 1000000 }, 0, 200000000);
    expect(conReajuste.patrimonioBruto).toBe(sinReajuste.patrimonioBruto + 200000000);
  });

  it('sin totalActivosConReajuste (parámetro opcional), no rompe y no afecta el total', () => {
    const r = calcularPatrimonio({ ...CATEGORIAS_VACIAS, efectivo: 1000000 }, 0);
    expect(r.patrimonioBruto).toBe(1000000);
  });
});
