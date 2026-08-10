// Clasificador del reporte de exógena descargado del MUISCA ("Consultas >
// Información exógena > Información reportada por terceros"). A diferencia
// del resto del motor (portado del .xlsm de Daniela, que es 100% manual),
// este módulo SÍ intenta prellenar los campos de las cédulas — a pedido
// explícito, para que Daniela edite/corrija en vez de digitar desde cero.
//
// Fuente de verdad: la estructura real del archivo (hoja "Reporte"), no
// documentación de terceros. Filas de cabecera (0-13 aprox.) traen
// metadatos; desde ahí hay dos tipos de fila de datos:
//
// 1) Filas "Tope N - Categoría" (sin NIT informante): son AGREGADOS usados
//    para la prueba de obligado a declarar (ingresos/patrimonio/consumo
//    TC/movimientos/compras). NUNCA se usan para prellenar un campo de
//    cédula — ya están contadas dentro de las filas de detalle de abajo;
//    sumarlas también duplicaría el valor. Se muestran solo como contexto.
// 2) Filas de detalle (con NIT informante): tienen columnas
//    [NIT propio, Nombre propio, NIT informante, Nombre informante,
//     Detalle, Valor, "Uso declaración Sugerida", Información Adicional].
//    La columna "Uso declaración Sugerida" casi siempre trae el renglón
//    del F210 (ej. "R29 Patrimonio Bruto", "R58 Ingresos") — es la señal
//    MÁS confiable porque la pone la propia DIAN, no una tabla de códigos
//    que hay que mantener y que puede quedar desactualizada.
//
// Estrategia de clasificación (conservadora a propósito):
//   a) Extraer el renglón de "Uso declaración Sugerida" → determina la
//      cédula/sección (gruesa).
//   b) Buscar palabras clave en "Detalle" → determina el campo específico
//      dentro de esa sección (fina). Si no hay match fino, cae en el campo
//      "otros" de esa sección — sigue siendo correcto en el total aunque
//      no en el detalle exacto.
//   c) Si no hay señal confiable de ninguna de las dos, la fila queda en
//      "sinClasificar" con el detalle y el valor completos — Daniela la
//      digita a mano donde corresponda. Nunca se inventa una clasificación
//      de baja confianza.

const PALABRA_TOPE = /^tope\s*\d/i;

function extraerConcepto(detalle) {
  const m = /concepto:\s*(\d+)/i.exec(detalle || '');
  return m ? m[1] : null;
}

function extraerRenglon(usoSugerido) {
  const m = /\bR\s?(\d{2,3})\b/i.exec(usoSugerido || '');
  return m ? Number(m[1]) : null;
}

// Renglón → { cedula, seccion }. "cedula" es null cuando el renglón no
// corresponde a ingresos/patrimonio de una cédula (ej. saldo a favor).
// Exportadas solo para el test de auditoría (verificar que cada campo que
// el clasificador puede producir exista de verdad en estadoInicial.js) —
// no usar fuera de este módulo y su test.
export const _internos = {};

const RENGLON_A_SECCION = {
  29: { destino: 'patrimonioActivo' },
  30: { destino: 'patrimonioDeuda' },
  32: { destino: 'ingreso', cedula: 'trabajo' },
  33: { destino: 'incrngo', cedula: 'trabajo' },
  35: { destino: 'afcPension', cedula: 'trabajo' },
  43: { destino: 'ingreso', cedula: 'honorarios' },
  44: { destino: 'incrngo', cedula: 'honorarios' },
  47: { destino: 'afcPension', cedula: 'honorarios' },
  58: { destino: 'ingreso', cedula: 'capital' },
  59: { destino: 'incrngo', cedula: 'capital' },
  63: { destino: 'afcPension', cedula: 'capital' },
  74: { destino: 'ingreso', cedula: 'noLaboral' },
  76: { destino: 'incrngo', cedula: 'noLaboral' },
  80: { destino: 'afcPension', cedula: 'noLaboral' },
  100: { destino: 'fueraDeAlcance', motivo: 'Pensiones — fuera de alcance esta temporada.' },
  131: { destino: 'saldoAFavorAnioAnterior' },
  132: { destino: 'retencion' },
};

// Palabras clave del "Detalle" → campo específico dentro de la sección ya
// determinada por el renglón. Solo se listan las que se han confirmado
// contra ejemplos reales o son inequívocas por su nombre.
const PALABRAS_CLAVE_INGRESO = {
  trabajo: [
    [/salari/i, 'salarios'],
    [/cesant[ií]a.*fondo|consignad/i, 'cesantiasFondo'],
    [/cesant[ií]a/i, 'cesantiasPagadas'],
    [/prestaci[oó]n(es)? social/i, 'prestacionesSociales'],
    [/prima/i, 'primasExtralegales'],
    [/comisi[oó]n/i, 'comisionesBonificaciones'],
    [/vi[aá]tico/i, 'viaticos'],
    [/representaci[oó]n/i, 'gastosRepresentacion'],
    [/honorario/i, 'honorariosSinCostos'],
    [/servicio/i, 'compensacionServiciosSinCostos'],
    [/subsidio|auxilio/i, 'subsidiosAuxilios'],
    [/indemnizaci[oó]n.*despido/i, 'indemnizacionesDespido'],
    [/alimentaci[oó]n/i, 'pagosAlimentacion'],
    [/exterior/i, 'ingresosExterior'],
  ],
  honorarios: [
    [/comisi[oó]n/i, 'comisionesBonificaciones'],
    [/honorario/i, 'honorarios'],
    [/servicio/i, 'compensacionServicios'],
    [/exterior/i, 'ingresosExterior'],
  ],
  capital: [
    [/intere?ses?.*particular/i, 'interesesParticulares'],
    [/descuento.*t[ií]tulo/i, 'descuentosTitulos'],
    [/bono|papel(es)? comercial/i, 'bonosPapelesComerciales'],
    [/colaboraci[oó]n empresarial/i, 'colaboracionEmpresarial'],
    [/intere?ses?.*(pagad|efectivamente)/i, 'intereses'],
    [/deuda p[uú]blica/i, 'rendimientosTitulosDeudaPublica'],
    [/fondo de inversi[oó]n|fic\b/i, 'fondosInversionColectiva'],
    [/rendimiento.*pensi[oó]n|pensi[oó]n.*rendimiento/i, 'rendimientosPensiones'],
    [/rendimiento.*cesant[ií]a|cesant[ií]a.*rendimiento/i, 'rendimientosCesantias'],
    [/\bafc\b|ahorro.*fomento/i, 'rendimientosAFC'],
    [/arrendamiento/i, 'arrendamientos'],
    [/regal[ií]a/i, 'regalias'],
    [/propiedad intelectual/i, 'propiedadIntelectual'],
    // CDT, rendimientos financieros genéricos, entidad vigilada: por
    // defecto van a "entidades financieras" — es la categoría más común
    // en los reportes reales (bancos, CDT, cuentas de ahorro).
    [/rendimiento|\bcdt\b|entidad.*financiera|vigilad/i, 'rendimientosEntidadesFinancieras'],
    [/intere?ses?/i, 'intereses'],
    [/exterior/i, 'ingresosExterior'],
  ],
  noLaboral: [
    [/honorario/i, 'honorarios2omastrabajadores'],
    [/servicio/i, 'compensacionServicios2omastrabajadores'],
    [/contrato.*prestaci[oó]n/i, 'contratosPrestacionServicios'],
    [/mercanc[ií]a/i, 'ventasMercancia'],
    [/comercial/i, 'ventasActividades'],
    [/inventario/i, 'ventasInventarios'],
    [/construcci[oó]n/i, 'construccion'],
    [/ganancial/i, 'gananciales'],
    [/da[nñ]o emergente/i, 'indemnizacionDanoEmergente'],
    [/lucro cesante/i, 'indemnizacionLucroCesante'],
    [/seguro.*vida/i, 'indemnizacionSegurosDistintosVida'],
    [/retiro.*pensi[oó]n/i, 'retiroPensionSinPermanencia'],
    [/retiro.*afc/i, 'retiroAfcSinPermanencia'],
    [/inmueble/i, 'ventaInmuebles'],
    [/inversi[oó]n/i, 'ventaInversiones'],
    [/activo fijo/i, 'ventaActivosFijos'],
    [/colaboraci[oó]n empresarial/i, 'colaboracionEmpresarial'],
    [/\bcan\b/i, 'ingresosCAN'],
    [/exterior/i, 'ingresosExterior'],
  ],
};

// Campo "cajón de sastre" cuando ninguna palabra clave coincide — DEBE
// existir de verdad en el objeto `ingresos` de esa cédula (ver conceptos.js)
// o el valor se guarda en una clave que ningún input muestra y el motor de
// cálculo ignora en silencio. La cédula de trabajo es la única que NO usa
// el nombre genérico "otros" (usa "otrosPagosLaborales") — bug real
// encontrado con un caso real: "Otros pagos Rentas de trabajo y pensión"
// se perdía por completo.
const CAMPO_OTROS_POR_CEDULA = {
  trabajo: 'otrosPagosLaborales',
  honorarios: 'otros',
  capital: 'otros',
  noLaboral: 'otros',
};

// INCRNGO — solo la cédula de trabajo tiene campos editables para esto en
// el wizard (honorarios/capital/no laboral no piden INCRNGO por separado,
// ver cedulas/honorariosServicios.js y noLaboral.js); si el renglón sugiere
// INCRNGO de otra cédula, no hay dónde prellenarlo — se deja sin clasificar.
// OJO: "alimentación" NO va aquí — el campo de alimentación vive en
// trabajo.ingresos.pagosAlimentacion (el motor calcula solo cuánto de ese
// ingreso es INCRNGO, tope 41 UVT/mes, ver cedulas/trabajo.js). Un valor
// aquí con clave "pagosAlimentacion" apuntaría a un campo inexistente en
// trabajo.incrngo — bug real encontrado por el test de auditoría.
const PALABRAS_CLAVE_INCRNGO_TRABAJO = [
  [/salud/i, 'saludObligatoria'],
  [/pensi[oó]n.*solidaridad|solidaridad.*pensi[oó]n/i, 'fondoSolidaridadPensional'],
  [/pensi[oó]n/i, 'pensionObligatoria'],
  [/educaci[oó]n|educativ/i, 'apoyosEducativos'],
];

const PALABRAS_CLAVE_PATRIMONIO_ACTIVO = [
  [/saldo.*cuenta|cuenta.*ahorro|cuenta corriente/i, 'efectivo'],
  [/inversi[oó]n|acci[oó]n|cuota.*inter[eé]s social|derecho social/i, 'inversiones'],
  [/cuenta.*cobrar/i, 'cuentasPorCobrar'],
  [/inventario/i, 'inventarios'],
  [/inmueble|veh[ií]culo|activo fijo/i, 'activosFijosInmuebles'],
];

Object.assign(_internos, {
  RENGLON_A_SECCION,
  PALABRAS_CLAVE_INGRESO,
  CAMPO_OTROS_POR_CEDULA,
  PALABRAS_CLAVE_INCRNGO_TRABAJO,
  PALABRAS_CLAVE_PATRIMONIO_ACTIVO,
});

// Frases (en la columna "Uso declaración Sugerida") que indican que la
// fila es un agregado de flujo/consumo para la prueba de topes — no un
// saldo patrimonial ni un ingreso puntual — se deja siempre sin
// clasificar, mostrada como contexto. Ej.: "Tope 4: Consignaciones e
// inversiones" en inversiones REALIZADAS en el año (no el saldo a
// dic-31, que si tiene su propio renglón R29 aparte).
const FRASES_SOLO_INFORMATIVAS = [/consignaciones e inversiones/i, /consumos? tc\b/i, /movimientos en cuentas/i];

// Extrae cédula/nombre del CONSULTANTE (dueño del reporte) de las filas de
// metadatos que trae siempre el archivo del MUISCA, antes de la tabla de
// detalle — para poder validar que el archivo cargado es del cliente
// correcto antes de prellenar nada (ver PasoExogena.jsx).
function extraerConsultante(filas, limiteFilas) {
  let cedula = '';
  let nombre = '';
  for (let i = 0; i < limiteFilas; i++) {
    const etiqueta = String(filas[i]?.[0] || '').trim().toLowerCase();
    const valor = filas[i]?.[2];
    if (etiqueta === 'identificación:') cedula = String(valor || '').trim();
    if (etiqueta === 'nombres / razón social:') nombre = String(valor || '').trim();
  }
  return { cedula, nombre };
}

/**
 * @param {any[][]} filas Filas crudas de XLSX.utils.sheet_to_json(hoja, {header:1}).
 */
export function parsearReporteExogena(filas) {
  const filaEncabezado = filas.findIndex((f) => f[0] === 'NIT' && f[4] === 'Detalle');
  if (filaEncabezado === -1) {
    return { reconocido: false, topes: [], detalle: [], consultante: { cedula: '', nombre: '' } };
  }

  const consultante = extraerConsultante(filas, filaEncabezado);
  const topes = [];
  const detalle = [];

  for (let i = filaEncabezado + 1; i < filas.length; i++) {
    const [, , nitInformante, nombreInformante, detalleTexto, valor, usoSugerido] = filas[i];
    if (!detalleTexto) continue;
    const valorNum = Number(valor) || 0;
    if (PALABRA_TOPE.test(detalleTexto) && !nitInformante) {
      topes.push({ detalle: detalleTexto, valor: valorNum });
    } else if (nitInformante) {
      detalle.push({
        nitInformante,
        nombreInformante,
        detalle: detalleTexto,
        valor: valorNum,
        usoSugerido: usoSugerido || '',
      });
    }
  }

  return { reconocido: true, topes, detalle, consultante };
}

/**
 * @param {{nitInformante:string, nombreInformante:string, detalle:string, valor:number, usoSugerido:string}[]} filasDetalle
 * @returns {{sugerencias: {ruta:string[], valor:number, etiqueta:string}[], sinClasificar: object[]}}
 */
export function clasificarFilasExogena(filasDetalle) {
  const sugerencias = [];
  const sinClasificar = [];

  for (const fila of filasDetalle) {
    // Casos especiales por texto — la DIAN a veces no da un renglón usable
    // (Uso vacío o "No aplica") aunque el concepto sea inequívoco por su
    // nombre, o da MÁS DE UN renglón y el primero no es el que necesita
    // nuestro motor. Se revisan ANTES del enrutamiento por renglón.
    //
    // "Cesantías consignadas al fondo": la DIAN sugiere "R29 Patrimonio
    // Bruto | R36 Otras rentas exentas" (primero patrimonio) — si se
    // enrutara solo por el primer renglón (como el resto de filas) caería
    // en patrimonio y NUNCA llegaría a la cédula de trabajo, donde el
    // motor sí la necesita para el cálculo de renta exenta (Art. 206 núm.
    // 4 ET). El .xlsm real de Daniela también la cuenta en ambos lados
    // (hoja PT, activo "Cesantías a cargo del fondo" + hoja de ingresos
    // de trabajo) — se replica esa doble entrada aquí.
    if (/cesant[ií]as?.*consignad.*fondo/i.test(fila.detalle)) {
      sugerencias.push({ ruta: ['trabajo', 'ingresos', 'cesantiasFondo'], valor: fila.valor, etiqueta: `${fila.detalle} (${fila.nombreInformante})` });
      sugerencias.push({ ruta: ['activosPatrimonio', 'efectivo'], valor: fila.valor, etiqueta: `${fila.detalle} (${fila.nombreInformante})` });
      continue;
    }
    if (/pagos? por alimentaci[oó]n.*uvt/i.test(fila.detalle)) {
      // Va a INGRESOS (no a incrngo): el motor calcula solo cuánto de este
      // valor es INCRNGO (tope 41 UVT/mes), ver cedulas/trabajo.js.
      sugerencias.push({ ruta: ['trabajo', 'ingresos', 'pagosAlimentacion'], valor: fila.valor, etiqueta: `${fila.detalle} (${fila.nombreInformante})` });
      continue;
    }
    if (/facturaci[oó]n electr[oó]nica.*beneficio|beneficio.*facturaci[oó]n electr[oó]nica/i.test(fila.detalle)) {
      sugerencias.push({ ruta: ['comprasConFacturaElectronica'], valor: fila.valor, etiqueta: fila.detalle });
      continue;
    }
    // "Total saldo a favor": el texto de "Uso declaración Sugerida" no
    // siempre trae "R131" de forma reconocible (visto truncado en un
    // reporte real) — se identifica por el Detalle directamente en vez de
    // depender del renglón.
    if (/total saldo a favor/i.test(fila.detalle)) {
      sugerencias.push({ ruta: ['saldoAFavorAnioAnteriorSinSolicitud'], valor: fila.valor, etiqueta: fila.detalle });
      continue;
    }
    if (/facturas tras ajustes por notas/i.test(fila.detalle)) {
      sinClasificar.push({ ...fila, motivo: 'Total de Tope 5 (compras) — el 1% de factura electrónica ya se toma de "susceptible de beneficio" si aparece esa fila.' });
      continue;
    }
    if (/dividendo|participaci[oó]n.*(2016|2017|utilidad)/i.test(fila.detalle)) {
      sinClasificar.push({ ...fila, motivo: 'Dividendos — fuera de alcance esta temporada, se declara aparte con el contador.' });
      continue;
    }
    // "Documentos soporte de adquisiciones": pese al nombre, el propio
    // texto de "Uso declaración Sugerida" aclara que son los INGRESOS de
    // ventas del consultante registrados por sus compradores (sustituto
    // de factura) — confirmado contra un reporte real.
    if (/documentos? soporte de adquisiciones/i.test(fila.detalle)) {
      sugerencias.push({
        ruta: ['noLaboral', 'ingresos', 'otros'],
        valor: fila.valor,
        etiqueta: `${fila.detalle} (${fila.nombreInformante})`,
        advertencia: 'Ingreso por venta registrada como "documento soporte" — verifica si corresponde mejor a otra cédula/concepto según la actividad del cliente.',
      });
      continue;
    }

    const renglon = extraerRenglon(fila.usoSugerido);
    const seccion = renglon ? RENGLON_A_SECCION[renglon] : null;

    if (FRASES_SOLO_INFORMATIVAS.some((re) => re.test(fila.usoSugerido)) && !seccion) {
      sinClasificar.push({ ...fila, motivo: 'Cifra agregada de flujo (prueba de topes) — no corresponde a una sola casilla.' });
      continue;
    }

    if (!seccion) {
      sinClasificar.push({ ...fila, motivo: 'No se identificó el renglón sugerido — revisar y digitar manualmente.' });
      continue;
    }

    if (seccion.destino === 'fueraDeAlcance') {
      sinClasificar.push({ ...fila, motivo: seccion.motivo });
    } else if (seccion.destino === 'incrngo') {
      if (seccion.cedula !== 'trabajo') {
        sinClasificar.push({ ...fila, motivo: `INCRNGO de la cédula ${seccion.cedula} — esta cédula no tiene campo de INCRNGO en el wizard, se resta directamente al total si aplica.` });
        continue;
      }
      const campo = PALABRAS_CLAVE_INCRNGO_TRABAJO.find(([re]) => re.test(fila.detalle))?.[1] || 'otros';
      sugerencias.push({ ruta: ['trabajo', 'incrngo', campo], valor: fila.valor, etiqueta: `${fila.detalle} (${fila.nombreInformante})` });
    } else if (seccion.destino === 'patrimonioActivo') {
      const categoria = PALABRAS_CLAVE_PATRIMONIO_ACTIVO.find(([re]) => re.test(fila.detalle))?.[1] || 'otros';
      sugerencias.push({ ruta: ['activosPatrimonio', categoria], valor: fila.valor, etiqueta: `${fila.detalle} (${fila.nombreInformante})` });
    } else if (seccion.destino === 'patrimonioDeuda') {
      sugerencias.push({ ruta: ['deudasPatrimonio'], valor: fila.valor, etiqueta: `${fila.detalle} (${fila.nombreInformante})` });
    } else if (seccion.destino === 'afcPension') {
      sugerencias.push({ ruta: [seccion.cedula, 'afcPensionVoluntaria'], valor: fila.valor, etiqueta: `${fila.detalle} (${fila.nombreInformante})` });
    } else if (seccion.destino === 'saldoAFavorAnioAnterior') {
      sugerencias.push({ ruta: ['saldoAFavorAnioAnteriorSinSolicitud'], valor: fila.valor, etiqueta: fila.detalle });
    } else if (seccion.destino === 'retencion') {
      sugerencias.push({
        ruta: ['filasRetenciones'],
        valor: fila.valor,
        etiqueta: fila.detalle,
        filaRetencion: { agenteRetenedor: fila.nombreInformante, concepto: fila.detalle, retencion: fila.valor },
      });
    } else if (seccion.destino === 'ingreso') {
      const reglas = PALABRAS_CLAVE_INGRESO[seccion.cedula];
      const campo = reglas.find(([re]) => re.test(fila.detalle))?.[1] || CAMPO_OTROS_POR_CEDULA[seccion.cedula];
      const cedulaInputKey = seccion.cedula === 'trabajo' ? 'trabajo' : seccion.cedula === 'honorarios' ? 'honorarios' : seccion.cedula;
      sugerencias.push({
        ruta: [cedulaInputKey, 'ingresos', campo],
        valor: fila.valor,
        etiqueta: `${fila.detalle} (${fila.nombreInformante})`,
        advertencia:
          (campo === 'honorariosSinCostos' || campo === 'compensacionServiciosSinCostos') ?
            'Verifica si contrataste 2 o más trabajadores en el año — si es así, este valor va en la cédula de Honorarios y servicios, no en Trabajo.' :
            undefined,
      });
    }
  }

  return { sugerencias, sinClasificar };
}

/**
 * Combina sugerencias que apuntan al mismo campo (suma) y arma un objeto
 * de "parches" listo para mezclar con el estado del wizard.
 * @param {{ruta:string[], valor:number}[]} sugerencias
 */
export function agruparSugerencias(sugerencias) {
  const totales = new Map(); // clave = ruta.join('.') -> {ruta, valor, filas}
  const retenciones = new Map(); // consolidadas por agente retenedor: un banco con 20 CDT no debe dejar 20 filas sueltas

  for (const s of sugerencias) {
    if (s.ruta[0] === 'filasRetenciones') {
      const clave = s.filaRetencion.agenteRetenedor;
      if (!retenciones.has(clave)) {
        // origen:'exogena' marca las filas que vinieron de acá, para que
        // al volver a prellenar se reemplacen solo estas (no las que
        // Daniela haya agregado a mano en el paso de Patrimonio).
        retenciones.set(clave, { agenteRetenedor: clave, concepto: 'Retenciones consolidadas (varias transacciones)', retencion: 0, origen: 'exogena' });
      }
      retenciones.get(clave).retencion += s.filaRetencion.retencion;
      continue;
    }
    const clave = s.ruta.join('.');
    if (!totales.has(clave)) totales.set(clave, { ruta: s.ruta, valor: 0, detalle: [] });
    const acumulado = totales.get(clave);
    acumulado.valor += s.valor;
    acumulado.detalle.push(s.etiqueta);
  }

  return { campos: [...totales.values()], filasRetenciones: [...retenciones.values()] };
}
