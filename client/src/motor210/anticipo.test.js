import { describe, it, expect } from 'vitest';
import { calcularAnticipo } from './anticipo.js';

describe('calcularAnticipo — Art. 807 ET', () => {
  it('primer año declarando: NO es cero — usa el Método 2 con tarifa del 25% (ANTICIPO!G15/G17 del .xlsm)', () => {
    const r = calcularAnticipo(10000000, 0, 1000000, 'primerAnio');
    expect(r.anticipo).toBe(10000000 * 0.25 - 1000000);
    expect(r.metodoUsado).toBe(2);
  });

  it('primer año: nunca negativo aunque las retenciones superen el 25% del impuesto neto', () => {
    const r = calcularAnticipo(1000000, 0, 5000000, 'primerAnio');
    expect(r.anticipo).toBe(0);
  });

  it('segundo año: tarifa 50%, se declara el menor entre método 1 y método 2', () => {
    const r = calcularAnticipo(10000000, 8000000, 0, 'segundoAnio');
    const metodo1 = ((10000000 + 8000000) / 2) * 0.5;
    const metodo2 = 10000000 * 0.5;
    expect(r.anticipo).toBe(Math.min(metodo1, metodo2));
  });

  it('tercer año y siguientes: tarifa 75%', () => {
    const r = calcularAnticipo(10000000, 10000000, 0, 'terceroYSiguientes');
    expect(r.anticipo).toBe(10000000 * 0.75);
  });
});
