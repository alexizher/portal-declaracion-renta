// Patrimonio — captura por categoría (el .xlsm de referencia lleva un
// auxiliar activo-por-activo completo; ver docs/reglas-tributarias-AG2025.md
// §8 para la justificación de la simplificación). Los activos fijos
// (inmuebles/vehículos) con reajuste fiscal detallado (Art. 70/73 ET, ver
// reajusteFiscal.js) se suman aparte, ENCIMA de la categoría simple — así
// el usuario puede seguir digitando un total rápido para lo que no
// necesita el detalle, y solo usar la tabla por activo cuando le importa
// el reajuste (inmuebles/vehículos con muchos años de tenencia).
import { noNegativo, redondearMiles } from './redondeo.js';

/**
 * @param {object} activos
 * @param {number} activos.efectivo Cuentas, ahorros, CDT, cesantías en fondo.
 * @param {number} activos.inversiones Acciones, cuotas, títulos.
 * @param {number} activos.cuentasPorCobrar
 * @param {number} activos.inventarios
 * @param {number} activos.activosFijosInmuebles
 * @param {number} activos.vehiculos
 * @param {number} activos.otros Intangibles, activos en el exterior.
 * @param {number} deudas Total pasivos (nacionales + exterior + otras).
 * @param {number} [totalActivosConReajuste] Suma de `reajusteFiscal.js` para
 *   los activos digitados en la tabla por activo — 0 si no se usó.
 */
export function calcularPatrimonio(activos, deudas, totalActivosConReajuste = 0) {
  const patrimonioBruto =
    activos.efectivo +
    activos.inversiones +
    activos.cuentasPorCobrar +
    activos.inventarios +
    activos.activosFijosInmuebles +
    activos.vehiculos +
    activos.otros +
    totalActivosConReajuste;
  const patrimonioLiquido = noNegativo(patrimonioBruto - deudas);

  return {
    patrimonioBruto: redondearMiles(patrimonioBruto),
    deudas: redondearMiles(deudas),
    patrimonioLiquido: redondearMiles(patrimonioLiquido),
  };
}
