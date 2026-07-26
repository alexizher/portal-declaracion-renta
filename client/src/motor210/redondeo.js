// Redondeo a la unidad de mil pesos exigido por el Art. 577 ET para las
// declaraciones tributarias: <500 hacia abajo, >=500 hacia arriba.
// Math.round ya redondea 0.5 hacia arriba (incluso con negativos hacia
// +Infinity), que es el comportamiento que pide la norma.
export function redondearMiles(valor) {
  return Math.round((valor || 0) / 1000) * 1000;
}

// La mayoría de renglones del F210 no pueden ser negativos (se muestran en
// 0 cuando el resultado de una resta da negativo).
export function noNegativo(valor) {
  return valor > 0 ? valor : 0;
}
