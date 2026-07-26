import { describe, it, expect } from 'vitest';
import { factorArt73, TABLA_ART_73 } from './tablaArt73.js';

describe('factorArt73', () => {
  it('tiene 125 filas (1900-2024)', () => {
    expect(TABLA_ART_73).toHaveLength(125);
    expect(TABLA_ART_73[0][0]).toBe(1900);
    expect(TABLA_ART_73.at(-1)[0]).toBe(2024);
  });

  it('devuelve el factor correcto por tipo de bien (fila 2016)', () => {
    expect(factorArt73(2016, 'acciones')).toBe(1.56);
    expect(factorArt73(2016, 'urbano')).toBe(1.54);
    expect(factorArt73(2016, 'rural')).toBe(1.52);
  });

  it('años anteriores a 1956 usan el mismo factor fijo', () => {
    expect(factorArt73(1900, 'urbano')).toBe(34527.89);
    expect(factorArt73(1955, 'urbano')).toBe(34527.89);
  });

  it('el año de adquisición igual al año gravable (2024) da factor 0 — sin reajuste aún', () => {
    expect(factorArt73(2024, 'urbano')).toBe(0);
  });

  it('año fuera de la tabla (futuro o anterior a 1900) devuelve 0, no revienta', () => {
    expect(factorArt73(2030, 'urbano')).toBe(0);
    expect(factorArt73(1850, 'rural')).toBe(0);
  });
});
