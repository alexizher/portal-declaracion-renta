// Genera el papel de trabajo (Excel de memoria de cálculo) descargable en
// el navegador — mismo patrón de escritura que XLSX ya usado en el
// proyecto (ver client/src/vistas/ImportarExcel.jsx para el patrón de lectura).
import * as XLSX from 'xlsx';
import { construirHojaFormulario210 } from './formularioDianExcel.js';

/**
 * @param {{casillas:object, advertencias:string[]}} resultado Salida de motor210/index.js liquidar().
 * @param {{nombre:string, cedula:string, anioGravable:number}} cliente
 */
export function generarPapelTrabajo(resultado, cliente) {
  const libro = XLSX.utils.book_new();

  const hojaFormulario = construirHojaFormulario210(resultado, cliente);
  XLSX.utils.book_append_sheet(libro, hojaFormulario, 'Formulario 210');

  const filasResumen = [
    ['Cliente', cliente.nombre],
    ['Cédula/NIT', cliente.cedula],
    ['Año gravable', cliente.anioGravable],
    ['Generado', new Date().toLocaleString('es-CO')],
    [],
    ['Nota', 'La hoja "Formulario 210" reproduce el layout del formulario oficial (misma posición de casillas que el liquidador de referencia).'
      + (cliente.primerApellido || cliente.primerNombre
        ? ''
        : ' El nombre del cliente no viene separado en apellidos/nombres (falta diligenciar en el paso "Cliente") — ajústalo a mano si vas a usar esta hoja como borrador de diligenciamiento literal.')],
    [],
    ['Advertencias'],
    ...(resultado.advertencias.length ? resultado.advertencias.map((a) => [a]) : [['Ninguna']]),
    [],
    ['⚠️ Borrador de trabajo — verificar cada cifra contra los soportes del cliente antes de presentar a la DIAN.'],
  ];
  const hojaResumen = XLSX.utils.aoa_to_sheet(filasResumen);
  XLSX.utils.book_append_sheet(libro, hojaResumen, 'Resumen');

  const nombreArchivo = `F210_${cliente.cedula || 'borrador'}_${cliente.anioGravable}.xlsx`;
  XLSX.writeFile(libro, nombreArchivo);
}
