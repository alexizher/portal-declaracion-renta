// Cédula de rentas de trabajo — replica CED.1 GENERAL (columnas D/E), que es
// la hoja REALMENTE usada en el .xlsm de referencia (no las vestigiales
// RENTAS TRABAJO/RESUMEN C.GENERAL, ver docs/reglas-tributarias-AG2025.md §2bis).
import { noNegativo } from '../redondeo.js';
import { porcentajeExentoCesantias } from '../constantes/cesantiasEscalonado.js';

function sumarValores(objeto) {
  return Object.values(objeto || {}).reduce((s, v) => s + (v || 0), 0);
}

/**
 * @param {object} input
 * @param {object} input.ingresos Ver campos abajo — todos en pesos, año completo.
 * @param {object} input.incrngo
 * @param {object} input.deducciones
 * @param {object} input.rentasExentasLimitadas Líneas de CED.1 GENERAL
 *   filas 118-125 (indemnizaciones, VIS/VIP, economía naranja, etc.) —
 *   sujetas al tope combinado del 40%/1.340 UVT (Art. 336 ET).
 * @param {object} input.rentasExentasNoLimitadas Líneas de CED.1 GENERAL
 *   filas 129-136 (Art. 206 núm. 6-9 ET — fuerzas militares, magistrados,
 *   jueces, rectores, países CAN, hoteles) — NO sujetas al tope combinado.
 * @param {number} input.afcPensionVoluntaria Aportes voluntarios a
 *   pensión + AFC (Art. 126-1/126-4 ET), antes de aplicar el tope 30%/3.800 UVT.
 * @param {number} [input.dependientesArt387] Deducción de dependientes ya
 *   prorrateada para esta cédula (CED.1 GENERAL fila 145) — se calcula en
 *   dependientes.js y se pasa de vuelta acá porque también resta de la base
 *   del 25% (CED.1 GENERAL!D141: `=E152-E148-E149`, E152 incluye fila 145).
 * @param {object} ctx
 * @param {number} ctx.uvt Valor UVT del año gravable.
 * @param {number} ctx.ingresoMensualPromedio6m Para la tabla escalonada de
 *   cesantías (Art. 206 num. 4 ET) — renglón 59 del certificado F220.
 * @param {number} ctx.mesesTrabajados
 */
export function calcularCedulaTrabajo(input, ctx) {
  const { uvt, ingresoMensualPromedio6m, mesesTrabajados } = ctx;
  const ing = input.ingresos;
  const advertencias = [];

  const ingresosBrutos =
    ing.salarios +
    ing.cesantiasPagadas +
    ing.cesantiasFondo +
    ing.cesantiasPre2017 +
    ing.prestacionesSociales +
    ing.primasExtralegales +
    ing.comisionesBonificaciones +
    ing.otrosPagosLaborales +
    ing.indemnizacionesDespido +
    ing.subsidiosAuxilios +
    ing.viaticos +
    ing.honorariosSinCostos +
    ing.compensacionServiciosSinCostos +
    ing.pagosAlimentacion +
    ing.gastosRepresentacion +
    ing.ingresosExterior;

  // INCRNGO — Art. 55/56 ET sin límite; RAIS con tope 25%/2.500 UVT (Art.
  // 55 ET); alimentación con doble control: salario <=310 UVT/mes Y tope
  // 41 UVT/mes prorrateado por meses trabajados (Art. 387-1 ET — ver
  // corrección de meses en docs §4.2, se usa mesesTrabajados en vez de 12 fijo).
  const inc = input.incrngo;
  const raisLimitado = Math.min(inc.aportesVoluntariosRAIS, ingresosBrutos * 0.25, 2500 * uvt);
  const salarioMensualEquivalente = mesesTrabajados > 0 ? ing.salarios / mesesTrabajados : 0;
  const topeAlimentacionMensual = 41 * uvt;
  const alimentacionPermitida =
    salarioMensualEquivalente <= 310 * uvt
      ? Math.min(ing.pagosAlimentacion, topeAlimentacionMensual * mesesTrabajados)
      : 0;
  if (ing.pagosAlimentacion > 0 && salarioMensualEquivalente > 310 * uvt) {
    advertencias.push(
      'Pagos por alimentación digitados pero el salario mensual supera 310 UVT: el Art. 387-1 ET no permite el beneficio, se excluyó del INCRNGO.'
    );
  }

  const incrngo =
    inc.saludObligatoria +
    inc.pensionObligatoria +
    inc.fondoSolidaridadPensional +
    inc.aportesARL +
    raisLimitado +
    inc.apoyosEducativos +
    inc.colciencias +
    inc.danoEmergente +
    inc.aportesARLIndependientes +
    alimentacionPermitida +
    inc.otros;

  const rentaLiquida = noNegativo(ingresosBrutos - incrngo);

  // Deducciones imputables — Art. 387 ET (medicina prepagada, intereses
  // vivienda, GMF, ICETEX, cesantías partícipes independientes, auto
  // híbrido/eléctrico). Dependientes (10%) se calcula aparte en
  // dependientes.js porque se prorratea entre trabajo y honorarios.
  const ded = input.deducciones;
  const medicinaPrepagadaLimitada = Math.min(ded.medicinaPrepagada, 192 * uvt);
  const interesesViviendaLimitados = Math.min(ded.interesesVivienda, 1200 * uvt);
  const gmfDeducible = ded.gmfCertificado * 0.5;
  const icetexLimitado = Math.min(ded.interesesIcetex, 100 * uvt);
  // CED.1 GENERAL!E150: MIN(digitado, renta líquida de esta cédula / 12, 2.500 UVT).
  const cesantiasParticipesLimitadas = Math.min(ded.cesantiasParticipesIndependientes, rentaLiquida / 12, 2500 * uvt);
  const autoHibridoDeducible = ded.autoHibrido * 0.5;
  const deduccionesSinGmfIcetex =
    medicinaPrepagadaLimitada + interesesViviendaLimitados + cesantiasParticipesLimitadas + autoHibridoDeducible;
  const deduccionesImputablesSinDependientes = deduccionesSinGmfIcetex + gmfDeducible + icetexLimitado;

  // Aportes voluntarios a pensión + AFC — Art. 126-1/126-4 ET, tope
  // conjunto MIN(30% ingreso bruto de la cédula, 3.800 UVT). Y cesantías
  // exentas — Art. 206 num. 4 ET, % escalonado según salario (tabla en
  // cesantiasEscalonado.js). AMBAS van a la bolsa "limitada" (sujeta al
  // tope de 1.340 UVT) — confirmado en CED.1 GENERAL filas 115-126, no en
  // la bolsa "no limitada" como sugerían las hojas vestigiales.
  const afcPensionLimitada = Math.min(input.afcPensionVoluntaria, ingresosBrutos * 0.3, 3800 * uvt);
  const porcentajeCesantias = porcentajeExentoCesantias(ingresoMensualPromedio6m, uvt);
  const cesantiasExentasLimitadas = (ing.cesantiasPagadas + ing.cesantiasFondo) * porcentajeCesantias;

  // Otras rentas exentas desglosadas — CED.1 GENERAL filas 118-125 (sujetas
  // al tope combinado) y 129-136 (Art. 206 núm. 6-9 ET y afines, sin tope).
  const otrasRentasExentasLimitadas = sumarValores(input.rentasExentasLimitadas);
  const otrasRentasExentasNoLimitadas = sumarValores(input.rentasExentasNoLimitadas);

  // Rentas exentas NO sujetas al límite del 40%/1.340 UVT: cesantías
  // pre-2017 (retiradas) + las desglosadas del Art. 206 núm. 6-9 ET y afines.
  const rentasExentasNoLimitadas = ing.cesantiasPre2017 * porcentajeCesantias + otrasRentasExentasNoLimitadas;

  // Renta exenta del 25% laboral — Art. 206 núm. 10 ET, tope 790 UVT/año.
  // Es la exención más común e importante de esta cédula. La base resta
  // ingreso laboral sin cesantías, INCRNGO, deducciones SIN GMF/ICETEX
  // (que SÍ incluyen dependientes, fila 145) y rentas exentas ya limitadas
  // (AFC/pensión + limitadas + no limitadas) — confirmado en CED.1
  // GENERAL!D138-D142: D141=E152-E148-E149 (E152 incluye fila 145
  // dependientes) y D142=E126-E117+E137-E128 (equivale a AFC/pensión +
  // otras limitadas + otras no limitadas, una vez se cancelan los términos
  // de cesantías que ya se excluyeron en D139).
  const ingresoLaboralSinCesantias = ingresosBrutos - ing.cesantiasPagadas - ing.cesantiasFondo - ing.cesantiasPre2017;
  const baseExencion25 = noNegativo(
    ingresoLaboralSinCesantias -
      incrngo -
      deduccionesSinGmfIcetex -
      (input.dependientesArt387 || 0) -
      afcPensionLimitada -
      otrasRentasExentasLimitadas -
      otrasRentasExentasNoLimitadas
  );
  const rentaExenta25Calculada = Math.min(baseExencion25 * 0.25, 790 * uvt);
  // Override manual — Daniela puede forzar el valor cuando el cálculo
  // automático no aplica para un cliente puntual (ej. bono de alimentación
  // que en la práctica no todos los clientes reciben, aunque esté
  // digitado). Se desvía del Excel oficial si se usa; queda advertido.
  const tieneOverride = input.rentaExenta25Manual !== null && input.rentaExenta25Manual !== undefined && input.rentaExenta25Manual !== '';
  const rentaExenta25 = tieneOverride ? Number(input.rentaExenta25Manual) : rentaExenta25Calculada;
  if (tieneOverride) {
    advertencias.push(
      `Renta exenta del 25% laboral sobrescrita manualmente ($${Math.round(rentaExenta25).toLocaleString('es-CO')} en vez del valor calculado $${Math.round(rentaExenta25Calculada).toLocaleString('es-CO')}) — se desvía del cálculo del Excel oficial.`
    );
  }

  // Nota: no se redondea aquí — el .xlsm de referencia mantiene precisión
  // completa en los cálculos intermedios (CED.1 GENERAL) y solo redondea a
  // la unidad de mil al ensamblar las casillas finales del Formulario 210
  // (ver formulario210.js). Redondear en cada paso intermedio acumula
  // diferencias de hasta varios cientos de pesos frente al Excel real.
  return {
    ingresosBrutos,
    incrngo,
    costosDeducciones: 0, // no aplica a rentas de trabajo dependiente
    rentaLiquida,
    deduccionesImputablesSinDependientes,
    rentasExentasNoLimitadas,
    rentaExenta25,
    rentaExenta25Calculada,
    afcPensionLimitada,
    cesantiasExentasLimitadas,
    // Expuestos para que index.js calcule el remanente de los topes
    // compartidos (medicina 192 UVT y vivienda/ICETEX en cascada con las
    // demás cédulas — trabajo siempre va primero, ver cascada.js).
    medicinaLimitada: medicinaPrepagadaLimitada,
    viviendaLimitada: interesesViviendaLimitados,
    icetexLimitado,
    // Base que entra a la bolsa de "rentas exentas y deducciones sujetas al
    // límite del 40%/1.340 UVT" ANTES de aplicar el tope combinado (se suma
    // con dependientes en exencionesDeducciones.js).
    baseExentasYDeduccionesLimitadas:
      deduccionesImputablesSinDependientes +
      rentaExenta25 +
      afcPensionLimitada +
      cesantiasExentasLimitadas +
      otrasRentasExentasLimitadas,
    advertencias,
  };
}
