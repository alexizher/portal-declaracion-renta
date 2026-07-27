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

/**
 * Separa un "nombre completo" en una sola cadena (como lo guarda la lista
 * general de Clientes, o una versión del liquidador anterior a la
 * identificación separada) en los 4 campos que pide el Formulario 210.
 * Heurística — convención más común en Colombia: las últimas 1-2 palabras
 * son apellidos, el resto son nombres. Es un punto de partida editable,
 * no un resultado certero (nombres compuestos son ambiguos).
 * @param {string} nombreCompleto
 */
export function dividirNombreCompleto(nombreCompleto) {
  const palabras = String(nombreCompleto || '').trim().split(/\s+/).filter(Boolean);
  const vacio = { primerNombre: '', otrosNombres: '', primerApellido: '', segundoApellido: '' };

  if (palabras.length === 0) return vacio;
  if (palabras.length === 1) return { ...vacio, primerNombre: palabras[0] };
  if (palabras.length === 2) return { ...vacio, primerNombre: palabras[0], primerApellido: palabras[1] };
  if (palabras.length === 3) return { ...vacio, primerNombre: palabras[0], primerApellido: palabras[1], segundoApellido: palabras[2] };

  // 4 o más palabras: las últimas 2 son apellidos, el resto son nombres.
  const apellidos = palabras.slice(-2);
  const nombres = palabras.slice(0, -2);
  return {
    primerNombre: nombres[0] || '',
    otrosNombres: nombres.slice(1).join(' '),
    primerApellido: apellidos[0],
    segundoApellido: apellidos[1],
  };
}
