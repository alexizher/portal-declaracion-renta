// Varias deducciones del F210 comparten UN SOLO tope repartido en cascada
// entre las cédulas (trabajo → honorarios → capital → no laboral), en vez
// de un tope independiente por cédula: medicina prepagada (192 UVT),
// intereses de vivienda (1.200 UVT), ICETEX (100 UVT) — confirmado en
// CED.1 GENERAL filas 146/147/149 del .xlsm de referencia (fórmulas
// G146/G147/G149/I149/K149 encadenan el saldo restante de cédula en
// cédula). No confundir con el tope combinado del Art. 336 ET
// (exencionesDeducciones.js), que es un mecanismo distinto y posterior.

/**
 * @param {number[]} valoresDigitados En el mismo orden que las cédulas
 *   (ej. [trabajo, honorariosServicios, capital, noLaboral]).
 * @param {number} topeTotal
 * @returns {number[]} Valor permitido por cédula, respetando el tope
 *   conjunto repartido en el orden dado.
 */
export function limitarConTopeCompartido(valoresDigitados, topeTotal) {
  let restante = topeTotal;
  return valoresDigitados.map((valor) => {
    const permitido = Math.min(valor, restante);
    restante = Math.max(0, restante - permitido);
    return permitido;
  });
}
