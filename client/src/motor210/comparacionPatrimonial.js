// Renta por comparación patrimonial — Art. 236-239 ET. Ver
// docs/reglas-tributarias-AG2025.md §6 (fórmula confirmada contra RENTA
// COMP PATR del .xlsm de referencia).
import { noNegativo, redondearMiles } from './redondeo.js';

/**
 * @param {object} params
 * @param {number} params.patrimonioLiquidoActual Casilla 31 de esta declaración.
 * @param {number} params.patrimonioLiquidoAnioAnterior Entrada manual (renglón 31 del F210 anterior).
 * @param {number} params.valorizaciones Ajuste no monetario (0 si no se modela detalle de inversiones, ver docs §6 nota).
 * @param {number} params.desvalorizaciones
 * @param {number} params.rentaLiquidaGravable Casilla 97/111 de esta declaración.
 * @param {number} params.rentasExentasTotales
 * @param {number} params.incrngoTotal
 * @param {number} [params.gananciaOcasionalNeta] Ingresos - costos por
 *   ganancia ocasional (antes de exenciones/tarifa) — 0 si no hubo. Ver
 *   docs/reglas-tributarias-AG2025.md §6.
 * @param {number} params.impuestosYAnticiposPagadosAnioGravable Entrada manual nueva.
 * @param {number} params.retencionesPracticadas Casilla 132.
 */
export function calcularRentaPorComparacionPatrimonial(params) {
  const {
    patrimonioLiquidoActual,
    patrimonioLiquidoAnioAnterior,
    valorizaciones = 0,
    desvalorizaciones = 0,
    rentaLiquidaGravable,
    rentasExentasTotales,
    incrngoTotal,
    gananciaOcasionalNeta = 0,
    impuestosYAnticiposPagadosAnioGravable,
    retencionesPracticadas,
  } = params;

  const diferenciaPatrimonial = noNegativo(
    patrimonioLiquidoActual + desvalorizaciones - valorizaciones - patrimonioLiquidoAnioAnterior
  );

  const rentasAjustadas = noNegativo(
    rentaLiquidaGravable +
      rentasExentasTotales +
      incrngoTotal +
      gananciaOcasionalNeta -
      impuestosYAnticiposPagadosAnioGravable -
      retencionesPracticadas
  );

  const rentaPorComparacion = noNegativo(diferenciaPatrimonial - rentasAjustadas);

  const advertencias = [];
  if (rentaPorComparacion > 0) {
    advertencias.push(
      'Se detectó renta por comparación patrimonial (Art. 236-239 ET): el patrimonio creció más de lo que la renta declarada explica. Verificar activos omitidos o pasivos inexistentes con el cliente ANTES de declarar este valor — no se incluye automáticamente sin revisión.'
    );
  }

  return {
    diferenciaPatrimonial: redondearMiles(diferenciaPatrimonial),
    rentasAjustadas: redondearMiles(rentasAjustadas),
    rentaPorComparacion: redondearMiles(rentaPorComparacion),
    advertencias,
  };
}
