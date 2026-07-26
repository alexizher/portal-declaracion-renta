// Dos mecanismos de dependientes, independientes y acumulables — ver
// docs/reglas-tributarias-AG2025.md §5.
import { redondearMiles } from './redondeo.js';

/**
 * Art. 387 ET — deducción del 10% del ingreso bruto por tener AL MENOS UN
 * dependiente, tope 384 UVT/año, prorrateada entre trabajo y honorarios
 * según su peso de ingresos brutos (así lo hace CED.1 GENERAL).
 * @param {boolean} tieneDependiente
 * @param {number} ingresosBrutosTrabajo
 * @param {number} ingresosBrutosHonorarios
 * @param {number} uvt
 */
export function deduccionDependientesArt387(tieneDependiente, ingresosBrutosTrabajo, ingresosBrutosHonorarios, uvt) {
  if (!tieneDependiente) return { trabajo: 0, honorarios: 0 };
  const topeAnual = 384 * uvt;
  const totalIngresos = ingresosBrutosTrabajo + ingresosBrutosHonorarios;
  if (totalIngresos <= 0) return { trabajo: 0, honorarios: 0 };
  const deduccionTrabajo = Math.min(ingresosBrutosTrabajo * 0.1, topeAnual);
  const restante = Math.max(0, topeAnual - deduccionTrabajo);
  const deduccionHonorarios = Math.min(ingresosBrutosHonorarios * 0.1, restante);
  return {
    trabajo: redondearMiles(deduccionTrabajo),
    honorarios: redondearMiles(deduccionHonorarios),
  };
}

/**
 * Art. 336 ET parágrafo — 72 UVT adicionales por cada dependiente, máximo
 * 4 (el formulario solo tiene 4 casillas de dependiente). Se suma DESPUÉS
 * del tope de 1.340 UVT, no lo consume.
 * @param {number} numeroDependientes 0 a 4.
 * @param {number} uvt
 */
export function adicionDependientesArt336(numeroDependientes, uvt) {
  const n = Math.min(Math.max(numeroDependientes, 0), 4);
  return redondearMiles(n * 72 * uvt);
}
