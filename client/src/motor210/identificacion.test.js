import { describe, it, expect } from 'vitest';
import { calcularDigitoVerificacion, dividirNombreCompleto } from './identificacion.js';

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

describe('dividirNombreCompleto', () => {
  it('4 palabras: últimas 2 son apellidos', () => {
    expect(dividirNombreCompleto('Raul Antonio Revelo Briganti')).toEqual({
      primerNombre: 'Raul',
      otrosNombres: 'Antonio',
      primerApellido: 'Revelo',
      segundoApellido: 'Briganti',
    });
  });

  it('3 palabras: 1 nombre + 2 apellidos', () => {
    expect(dividirNombreCompleto('Jaime Herrera Ruiz')).toEqual({
      primerNombre: 'Jaime',
      otrosNombres: '',
      primerApellido: 'Herrera',
      segundoApellido: 'Ruiz',
    });
  });

  it('2 palabras: nombre + apellido', () => {
    expect(dividirNombreCompleto('Jaime Herrera')).toEqual({
      primerNombre: 'Jaime',
      otrosNombres: '',
      primerApellido: 'Herrera',
      segundoApellido: '',
    });
  });

  it('1 palabra: solo primer nombre', () => {
    expect(dividirNombreCompleto('Jaime')).toEqual({
      primerNombre: 'Jaime',
      otrosNombres: '',
      primerApellido: '',
      segundoApellido: '',
    });
  });

  it('5+ palabras: todo lo que sobra antes de los 2 apellidos va a "otros nombres"', () => {
    expect(dividirNombreCompleto('Jaime Alexis Maria Herrera Ruiz')).toEqual({
      primerNombre: 'Jaime',
      otrosNombres: 'Alexis Maria',
      primerApellido: 'Herrera',
      segundoApellido: 'Ruiz',
    });
  });

  it('vacío o solo espacios devuelve todos los campos vacíos', () => {
    expect(dividirNombreCompleto('')).toEqual({ primerNombre: '', otrosNombres: '', primerApellido: '', segundoApellido: '' });
    expect(dividirNombreCompleto('   ')).toEqual({ primerNombre: '', otrosNombres: '', primerApellido: '', segundoApellido: '' });
    expect(dividirNombreCompleto(null)).toEqual({ primerNombre: '', otrosNombres: '', primerApellido: '', segundoApellido: '' });
  });
});
