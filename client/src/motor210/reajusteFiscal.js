// Valor patrimonial de activos fijos (inmuebles/vehículos) con reajuste —
// replica PATRIMONIO!334-436 del .xlsm de referencia. Dos mecanismos
// independientes, se declara el MAYOR entre ambos (más el valor
// catastral/avalúo si es mayor a los dos):
//
// 1) Reajuste fiscal ANUAL (Art. 70 ET, opcional) — % único publicado por
//    la DIAN cada año (DATOS BÁSICOS!E18) sobre el costo/valor declarado el
//    año anterior + mejoras/valorizaciones pagadas este año.
// 2) Tabla Art. 73 ET (opcional, SOLO bienes raíces — "el reajuste del
//    Art. 73 del E.T. solo aplica para Bienes Raíces", nota literal de la
//    hoja PATRIMONIO) — factor por año de adquisición × tipo de bien
//    (urbano/rural), multiplicado directo por el costo histórico de
//    adquisición (no el valor declarado el año anterior).
import { noNegativo } from './redondeo.js';
import { factorArt73 } from './constantes/tablaArt73.js';

/**
 * @param {object} activo
 * @param {'inmuebleUrbano'|'inmuebleRural'|'vehiculo'} activo.tipo El Art. 73
 *   ET nunca aplica a vehículos, sin importar `aplicaArt73`.
 * @param {number} activo.anioAdquisicion
 * @param {number} activo.valorAdquisicion Costo histórico (E).
 * @param {number} activo.valorDeclaradoAnioAnterior Renglón 31 del F210 anterior para este activo (F).
 * @param {number} activo.mejorasYValorizaciones Pagadas efectivamente este año (G).
 * @param {boolean} activo.aplicaReajusteFiscal (H)
 * @param {boolean} activo.aplicaArt73 (K) — ignorado si `tipo` es 'vehiculo'.
 * @param {number} activo.valorCatastralOAvaluo Catastral (inmuebles) o avalúo comercial (vehículos).
 * @param {object} ctx
 * @param {number} ctx.anioGravable
 * @param {number} ctx.tasaReajusteFiscal DATOS BÁSICOS!E18 del año gravable.
 * @returns {{costoFiscalAjustado:number, ajusteArt73:number, valorPatrimonial:number}}
 */
export function calcularValorActivoConReajuste(activo, ctx) {
  const { anioGravable, tasaReajusteFiscal } = ctx;
  const compradoEsteAnio = activo.anioAdquisicion === anioGravable;
  const base = (compradoEsteAnio ? activo.valorAdquisicion : activo.valorDeclaradoAnioAnterior) + activo.mejorasYValorizaciones;

  const montoReajusteFiscal = activo.aplicaReajusteFiscal ? base * tasaReajusteFiscal : 0;
  const costoFiscalAjustado = base + montoReajusteFiscal;

  const tablaAplica = activo.tipo !== 'vehiculo' && activo.aplicaArt73;
  const factor = tablaAplica ? factorArt73(activo.anioAdquisicion, activo.tipo === 'inmuebleUrbano' ? 'urbano' : 'rural') : 0;
  const ajusteArt73 = activo.valorAdquisicion * factor + activo.mejorasYValorizaciones;

  const valorPatrimonial = Math.max(costoFiscalAjustado, ajusteArt73, activo.valorCatastralOAvaluo || 0);

  return {
    costoFiscalAjustado: noNegativo(costoFiscalAjustado),
    ajusteArt73: noNegativo(ajusteArt73),
    valorPatrimonial: noNegativo(valorPatrimonial),
  };
}

/**
 * Suma el valor patrimonial de una lista de activos con reajuste — para
 * combinarlo con los totales por categoría de patrimonio.js.
 * @param {object[]} activos
 * @param {object} ctx
 */
export function totalActivosConReajuste(activos, ctx) {
  return (activos || []).reduce((s, a) => s + calcularValorActivoConReajuste(a, ctx).valorPatrimonial, 0);
}
