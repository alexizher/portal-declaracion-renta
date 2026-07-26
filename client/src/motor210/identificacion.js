// Dígito de verificación del NIT — algoritmo módulo 11 de la DIAN, igual al
// usado en 'DATOS INICIALES'!D27 del .xlsm de referencia (MID(...,15,1)*3 +
// MID(...,14,1)*7 + ... leyendo el NIT de derecha a izquierda).
const PESOS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

/**
 * @param {string|number} numeroDocumento NIT o cédula, solo dígitos.
 * @returns {number|null} Dígito de verificación (0-9), o null si no hay
 *   número de documento.
 */
export function calcularDigitoVerificacion(numeroDocumento) {
  const digitos = String(numeroDocumento || '').replace(/\D/g, '');
  if (!digitos) return null;

  const padded = digitos.padStart(15, '0');
  const total = padded
    .split('')
    .reverse()
    .reduce((suma, digito, i) => suma + Number(digito) * (PESOS[i] || 0), 0);

  const residuo = total % 11;
  return residuo <= 1 ? residuo : 11 - residuo;
}
