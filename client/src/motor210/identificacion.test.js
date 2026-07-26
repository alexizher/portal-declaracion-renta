import { describe, it, expect } from 'vitest';
import { calcularDigitoVerificacion } from './identificacion.js';

describe('calcularDigitoVerificacion', () => {
  it('calcula el DV correcto para NITs conocidos', () => {
    expect(calcularDigitoVerificacion('899999068')).toBe(1); // Ecopetrol
    expect(calcularDigitoVerificacion('800197268')).toBe(4);
  });

  it('ignora caracteres no numéricos (puntos)', () => {
    expect(calcularDigitoVerificacion('899.999.068')).toBe(1);
  });

  it('devuelve null si no hay número de documento', () => {
    expect(calcularDigitoVerificacion('')).toBeNull();
    expect(calcularDigitoVerificacion(null)).toBeNull();
  });
});
