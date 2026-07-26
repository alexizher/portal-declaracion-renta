// Reproduce el layout EXACTO de la hoja "FORMULARIO 210" del .xlsm de
// referencia (Liquidador-DRPN-AG-2024, ver docs/reglas-tributarias-AG2025.md
// §7) — misma celda por casilla, mismas etiquetas — para que el Excel que
// descarga Daniela se vea como el formulario real de la DIAN, no como una
// tabla plana. Fuente de las posiciones: client/tools/xlsm-dump/FORMULARIO_210.md
// (volcado directo del archivo real, no inventado).
//
// Limitación conocida: la librería `xlsx` (SheetJS, versión gratuita) no
// conserva estilos de celda (negrita, relleno) al escribir — verificado
// escribiendo y releyendo un archivo de prueba. Por eso esta hoja replica
// POSICIONES y ETIQUETAS con fidelidad, pero sale sin negrita/color. Igual
// aplica anchos de columna para que sea legible.
import * as XLSX from 'xlsx';

// Etiquetas y marcadores de casilla que son SIEMPRE iguales, sin importar
// el cliente — texto literal transcrito de FORMULARIO_210.md.
const ETIQUETAS_FIJAS = [
  ['H11', 'Declaración de renta y complementario personas naturales y asimiladas residentes y sucesiones ilíquidas de causantes residentes'],
  ['U11', 'Privada'],
  ['X11', '210'],
  ['D13', '1. Año'],
  ['D14', 'Espacio reservado para la DIAN'],
  ['Q14', '4. Número de formulario'],
  ['B19', 'Datos del declarante'],
  ['C19', '5. Número de Identificación Tributaria (NIT)'],
  ['I19', '6. DV'],
  ['J19', '7. Primer apellido'],
  ['N19', '8. Segundo apellido'],
  ['R19', '9. Primer nombre'],
  ['V19', '10. Otros nombres'],
  ['Z19', '12. Cód. Dirección Seccional'],
  ['B21', '24. Actividad económica principal'],
  ['V21', '28. Uno por ciento (1%) de compras con factura electrónica'],
  ['B22', 'Patrimonio'],
  ['E22', 'Total patrimonio bruto'],
  ['I22', 29],
  ['O22', 'Deudas'],
  ['R22', 30],
  ['V22', 'Total patrimonio liquido'],
  ['Y22', 31],
  ['B23', 'Cédula general'],
  ['C23', 'Conceptos/rentas'],
  ['G23', 'Rentas de trabajo'],
  ['M23', 'Rentas de trabajo que no provengan de una relación laboral o legal y reglamentaria'],
  ['T23', 'Rentas de capital'],
  ['W23', 'Rentas no laborales'],
  ['C24', 'Ingresos brutos'],
  ['G24', 32], ['M24', 43], ['T24', 58], ['W24', 74],
  ['C25', 'Devoluciones, rebajas y descuentos'],
  ['W25', 75],
  ['C26', 'Ingresos no constitutivos de renta'],
  ['G26', 33], ['M26', 44], ['T26', 59], ['W26', 76],
  ['C27', 'Costos y deducciones procedentes'],
  ['M27', 45], ['T27', 60], ['W27', 77],
  ['C28', 'Renta líquida'],
  ['G28', 34], ['M28', 46], ['T28', 61], ['W28', 78],
  ['C29', 'Rentas líquidas pasivas - ECE'],
  ['T29', 62], ['W29', 79],
  ['C30', 'Rentas exentas'],
  ['D30', 'Aportes voluntarios AFC, FVP, y/o AVC'],
  ['G30', 35], ['M30', 47], ['T30', 63], ['W30', 80],
  ['D31', 'Otras rentas exentas'],
  ['G31', 36], ['M31', 48], ['T31', 64], ['W31', 81],
  ['D32', 'Total rentas exentas'],
  ['G32', 37], ['M32', 49], ['T32', 65], ['W32', 82],
  ['C33', 'Deducciones imputables'],
  ['D33', 'Intereses de vivienda'],
  ['G33', 38], ['M33', 50], ['T33', 66], ['W33', 83],
  ['D34', 'Otras deducciones imputables'],
  ['G34', 39], ['M34', 51], ['T34', 67], ['W34', 84],
  ['D35', 'Total deducciones imputables'],
  ['G35', 40], ['M35', 52], ['T35', 68], ['W35', 85],
  ['C36', 'Rentas exentas y deducciones imputables (Limitadas)'],
  ['G36', 41], ['M36', 53], ['T36', 69], ['W36', 86],
  ['C37', 'Renta líquida ordinaria del ejercicio'],
  ['M37', 54], ['T37', 70], ['W37', 87],
  ['C38', 'Pérdida líquida del ejercicio'],
  ['M38', 55], ['T38', 71], ['W38', 88],
  ['C39', 'Compensación por pérdidas'],
  ['M39', 56], ['T39', 72], ['W39', 89],
  ['C40', 'Renta líquida ordinaria'],
  ['G40', 42], ['M40', 57], ['T40', 73], ['W40', 90],
  ['C41', 'Ren. Líquida céd. gen.'], ['E41', 91],
  ['J41', 'Ren. Ex. Y ded. Imp. lim.'], ['K41', 92],
  ['O41', 'Ren. Líquida ord. cédula gen.'], ['R41', 93],
  ['V41', 'Comp. Pérdidas año 2018 y ant.'], ['Y41', 94],
  ['C42', 'Comp. Por exc renta presuntiva'], ['E42', 95],
  ['J42', 'Rentas gravables'], ['K42', 96],
  ['O42', 'Ren. Líquida grav. cédula gen.'], ['R42', 97],
  ['V42', 'Renta presuntiva'], ['Y42', 98],
  ['B43', 'Cedula de pensiones (fuera de alcance esta temporada)'],
  ['C43', 'Ingresos brutos por rentas de pensiones del país y del exterior'], ['I43', 99],
  ['O43', 'Liquidación privada'],
  ['P43', 'Impuesto sobre las rentas liquidas gravables'],
  ['Q43', 'Cédula general, de pensiones y de dividendos y participaciones (base casilla 111)'], ['W43', 116],
  ['C44', 'Ingresos no constitutivos de renta'], ['I44', 100],
  ['C45', 'Renta líquida (99 - 100)'], ['I45', 101],
  ['Q45', 'Renta presuntiva, de pensiones y de dividendos y participaciones (base casilla 111)'], ['W45', 117],
  ['C46', 'Rentas exentas de pensiones'], ['I46', 102],
  ['Q46', 'Por dividendos y participaciones año 2017 y siguientes, 2a subcédula (Art 240 E.T)'], ['W46', 118],
  ['C47', 'Renta líquida gravable cédula de pensiones (101 - 102)'], ['I47', 103],
  ['Q47', 'Por dividendos y participaciones año 2016 (base casilla 106)'], ['W47', 119],
  ['B48', 'Cédula de dividendos y participaciones (fuera de alcance esta temporada)'],
  ['C48', 'Dividendos y/o participaciones año 2016 y anteriores, y otros'], ['I48', 104],
  ['Q48', 'Por dividendos y participaciones recibidas del exterior (base casillas 109 - 110)'], ['W48', 120],
  ['C49', 'Ingresos no constitutivos de renta'], ['I49', 105],
  ['Q49', 'Total impuesto sobre las rentas líquidas gravables (116+117+118+119+120)'], ['W49', 121],
  ['C50', 'Renta líquida ordinaria año 2016 y anteriores (104 - 105)'], ['I50', 106],
  ['P50', 'Descuentos'], ['Q50', 'Impuestos pagados en el exterior'], ['R50', 122],
  ['W50', 'Donaciones'], ['Y50', 123],
  ['C51', '1a. Subcédula años 2017 y siguientes numeral 3 art. 49 del E.T.'], ['I51', 107],
  ['Q51', 'Dividendos, participaciones y otros'], ['R51', 124],
  ['W51', 'Total descuentos tributarios (123 + 124 + 125)'], ['Y51', 125],
  ['C52', '2a. Subcédula años 2017 y siguientes, parágrafo 2° art. 49 del E.T.'], ['I52', 108],
  ['P52', 'Impuesto neto de renta (121 - 125)'], ['W52', 126],
  ['C53', 'Renta líquida pasiva dividendos – ECE y/o recibidos del exterior'], ['I53', 109],
  ['P53', 'Impuesto de ganancias ocasionales (Casilla 115 por tarifa)'], ['W53', 127],
  ['C54', 'Rentas exentas de la casilla 109'], ['I54', 110],
  ['P54', 'Descuento por impuestos pagados en el exterior por ganancias ocasionales'], ['W54', 128],
  ['B55', 'Renta líquida gravable (Cédula general o Renta presuntiva, de pensiones y de dividendos y participaciones art. 241 E.T.)'], ['I55', 111],
  ['P55', 'Total impuesto a cargo (126 + 127 - 128)'], ['W55', 129],
  ['B56', 'Ganancias ocasionales (fuera de alcance esta temporada)'],
  ['C56', 'Ingresos por ganancias ocasionales del país y del exterior'], ['I56', 112],
  ['P56', 'Anticipo renta liquidado año gravable anterior'], ['W56', 130],
  ['C57', 'Costos por ganancias ocasionales'], ['I57', 113],
  ['P57', 'Saldo a favor del año gravable anterior sin solicitud de devolución y/o compensación'], ['W57', 131],
  ['C58', 'Ganancias ocasionales no gravadas y exentas'], ['I58', 114],
  ['P58', 'Retenciones año gravable a declarar'], ['W58', 132],
  ['C59', 'Ganancias ocasionales gravables (112 - 113 - 114)'], ['I59', 115],
  ['P59', 'Anticipo renta para el año gravable siguiente'], ['W59', 133],
  ['B60', 'Saldo a pagar por impuesto (129 + 133 - 130 - 131 - 132)'], ['E60', 134],
  ['I60', 'Sanciones'], ['K60', 135],
  ['O60', 'Total saldo a pagar (129 + 133 + 135 - 130 - 131 - 132)'], ['R60', 136],
  ['V60', 'Total saldo a favor (130 + 131 + 132 - 129 - 133 - 135)'], ['Y60', 137],
  ['B61', 'Número de dependientes económicos:'], ['F61', 138],
  ['I61', 'Adición por dependientes a la casilla 92'], ['K61', 139],
  ['O61', 'Ud. superó tope indicativo art. 336-1 del E.T., marque X:'], ['R61', 140],
  ['V61', 'Aporte voluntario:'], ['Y61', 141],
  ['B66', '981. Cód. Representación'],
  ['G66', 'Firma del declarante o de quien lo representa'],
  ['K66', '997. Espacio exclusivo para el sello de la entidad recaudadora'],
  ['U67', '980. Pago total $'],
  ['B69', '982. Cód. Contador'],
  ['F69', 'Firma contador'],
  ['H69', '994. Con salvedades'],
  ['B71', '983. No. Tarjeta profesional'],
];

// Casilla → celda de VALOR (donde el .xlsm tenía la fórmula, aquí va
// nuestro número ya calculado). Cubre solo las casillas del alcance MVP;
// las demás (pensiones/dividendos/ganancias ocasionales) quedan en 0 —
// consistente con "fuera de alcance esta temporada", no se omiten filas,
// solo el valor.
const CASILLA_A_CELDA = {
  29: 'J22', 30: 'S22', 31: 'Z22',
  32: 'H24', 43: 'N24', 58: 'U24', 74: 'X24',
  75: 'X25',
  33: 'H26', 44: 'N26', 59: 'U26', 76: 'X26',
  45: 'N27', 60: 'U27', 77: 'X27',
  34: 'H28', 46: 'N28', 61: 'U28', 78: 'X28',
  62: 'U29', 79: 'X29',
  35: 'H30', 47: 'N30', 63: 'U30', 80: 'X30',
  36: 'H31', 48: 'N31', 64: 'U31', 81: 'X31',
  37: 'H32', 49: 'N32', 65: 'U32', 82: 'X32',
  38: 'H33', 50: 'N33', 66: 'U33', 83: 'X33',
  39: 'H34', 51: 'N34', 67: 'U34', 84: 'X34',
  40: 'H35', 52: 'N35', 68: 'U35', 85: 'X35',
  41: 'H36', 53: 'N36', 69: 'U36', 86: 'X36',
  54: 'N37', 70: 'U37', 87: 'X37',
  55: 'N38', 71: 'U38', 88: 'X38',
  56: 'N39', 72: 'U39', 89: 'X39',
  42: 'H40', 57: 'N40', 73: 'U40', 90: 'X40',
  91: 'F41', 92: 'L41', 93: 'S41', 94: 'Z41',
  95: 'F42', 96: 'L42', 97: 'S42', 98: 'Z42',
  99: 'J43', 116: 'X43',
  100: 'J44',
  101: 'J45', 117: 'X45',
  102: 'J46', 118: 'X46',
  103: 'J47', 119: 'X47',
  104: 'J48', 120: 'X48',
  105: 'J49', 121: 'X49',
  106: 'J50',
  122: 'S50', 123: 'Z50',
  107: 'J51', 124: 'S51',
  108: 'J52', 125: 'Z51',
  109: 'J53', 126: 'X52',
  110: 'J54', 127: 'X53',
  111: 'J55', 128: 'X54',
  112: 'J56', 129: 'X55',
  113: 'J57', 130: 'X56',
  114: 'J58', 131: 'X57',
  115: 'J59', 132: 'X58',
  133: 'X59',
  134: 'F60', 135: 'L60', 136: 'S60', 137: 'Z60',
  138: 'G61', 139: 'L61',
};

const ANCHOS_COLUMNAS = [
  { wch: 3 }, { wch: 10 }, { wch: 18 }, { wch: 3 }, { wch: 14 }, { wch: 3 }, { wch: 3 }, { wch: 14 },
  { wch: 3 }, { wch: 3 }, { wch: 14 }, { wch: 3 }, { wch: 3 }, { wch: 14 }, { wch: 3 }, { wch: 3 },
  { wch: 14 }, { wch: 3 }, { wch: 3 }, { wch: 14 }, { wch: 3 }, { wch: 3 }, { wch: 14 }, { wch: 3 },
  { wch: 3 }, { wch: 14 }, { wch: 3 }, { wch: 3 },
];

function set(ws, celda, valor) {
  if (typeof valor === 'number') {
    ws[celda] = { t: 'n', v: valor };
  } else {
    ws[celda] = { t: 's', v: String(valor) };
  }
}

/**
 * @param {{casillas: Record<string, number>}} resultado Salida de motor210/index.js liquidar().
 * @param {{nombre:string, cedula:string, anioGravable:number, primerApellido?:string,
 *   segundoApellido?:string, primerNombre?:string, otrosNombres?:string}} cliente
 * @returns {object} Hoja de SheetJS lista para XLSX.utils.book_append_sheet.
 */
export function construirHojaFormulario210(resultado, cliente) {
  const ws = {};

  for (const [celda, valor] of ETIQUETAS_FIJAS) set(ws, celda, valor);

  set(ws, 'E13', cliente.anioGravable);
  set(ws, 'C20', cliente.cedula || ''); // casilla 5 (NIT/cédula)
  set(ws, 'I20', resultado.casillas[6] ?? ''); // casilla 6 (dígito de verificación)
  // Casillas 7-10: si el wizard ya capturó los nombres/apellidos por
  // separado (Fase 1 de identificación) se usan tal cual; si no, se cae al
  // "nombre completo" en la celda de primer apellido para no perder el dato.
  const tieneNombresSeparados = cliente.primerApellido || cliente.primerNombre;
  set(ws, 'J20', tieneNombresSeparados ? cliente.primerApellido || '' : cliente.nombre || ''); // casilla 7
  set(ws, 'N20', tieneNombresSeparados ? cliente.segundoApellido || '' : ''); // casilla 8
  set(ws, 'R20', cliente.primerNombre || ''); // casilla 9
  set(ws, 'V20', cliente.otrosNombres || ''); // casilla 10
  if (resultado.casillas[28] != null) set(ws, 'Z21', resultado.casillas[28]);

  for (const [casilla, celda] of Object.entries(CASILLA_A_CELDA)) {
    const valor = resultado.casillas[casilla];
    set(ws, celda, valor ?? 0);
  }

  set(ws, 'V67', resultado.casillas[136] ?? resultado.casillas[134] ?? 0);

  const todasLasCeldas = [...ETIQUETAS_FIJAS.map(([c]) => c), ...Object.values(CASILLA_A_CELDA), 'E13', 'C20', 'I20', 'J20', 'N20', 'R20', 'V20', 'Z21', 'V67'];
  const filas = todasLasCeldas.map((c) => XLSX.utils.decode_cell(c).r);
  const cols = todasLasCeldas.map((c) => XLSX.utils.decode_cell(c).c);
  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: Math.max(...filas), c: Math.max(...cols) },
  });
  ws['!cols'] = ANCHOS_COLUMNAS;

  return ws;
}
