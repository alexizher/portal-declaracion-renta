#!/usr/bin/env node
// Vuelca fórmulas y valores cacheados de una o varias hojas del liquidador
// .xlsm de referencia a JSON + Markdown legible, para analizar su lógica sin
// depender de openpyxl/Python. Reutiliza `xlsx` (ya es dependencia del
// cliente) — SheetJS lee .xlsm igual que .xlsx; las macros VBA no se
// ejecutan ni se necesitan, solo se leen celdas/fórmulas/valores.
//
// Uso:
//   node client/tools/dump-xlsm.mjs "<ruta al .xlsm>" "HOJA1" "HOJA2" ...
//   node client/tools/dump-xlsm.mjs "<ruta al .xlsm>" --todas   (lista nombres de hojas)

import * as XLSX from '../node_modules/xlsx/xlsx.mjs';
import * as fs from 'node:fs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

XLSX.set_fs(fs);

const __dirname = dirname(fileURLToPath(import.meta.url));
const SALIDA = join(__dirname, 'xlsm-dump');

const [, , rutaArchivo, ...hojas] = process.argv;

if (!rutaArchivo) {
  console.error('Uso: node dump-xlsm.mjs <ruta.xlsm> <HOJA...|--todas>');
  process.exit(1);
}

const libro = XLSX.readFile(rutaArchivo, { cellFormula: true, cellNF: false, cellDates: true });

if (hojas[0] === '--todas' || hojas.length === 0) {
  console.log('Hojas disponibles:');
  libro.SheetNames.forEach((n, i) => console.log(`${i + 1}. ${n}`));
  process.exit(0);
}

mkdirSync(SALIDA, { recursive: true });

function nombreArchivoSeguro(nombreHoja) {
  return nombreHoja.replace(/[^\w.-]+/g, '_');
}

for (const nombreHoja of hojas) {
  const hoja = libro.Sheets[nombreHoja];
  if (!hoja) {
    console.error(`⚠️  Hoja no encontrada: "${nombreHoja}" — disponibles: ${libro.SheetNames.join(', ')}`);
    continue;
  }

  const ref = hoja['!ref'];
  const rango = ref ? XLSX.utils.decode_range(ref) : null;
  const celdas = [];

  for (const clave of Object.keys(hoja)) {
    if (clave.startsWith('!')) continue;
    const celda = hoja[clave];
    if (celda.v === undefined && celda.f === undefined) continue;
    celdas.push({
      celda: clave,
      valor: celda.v ?? null,
      formula: celda.f ?? null,
      tipo: celda.t ?? null,
    });
  }

  const base = nombreArchivoSeguro(nombreHoja);
  const jsonPath = join(SALIDA, `${base}.json`);
  const mdPath = join(SALIDA, `${base}.md`);

  writeFileSync(
    jsonPath,
    JSON.stringify({ hoja: nombreHoja, rango: ref ?? null, celdas }, null, 2)
  );

  const lineasMd = [
    `# ${nombreHoja}`,
    '',
    `Rango: \`${ref ?? '(vacía)'}\` · ${celdas.length} celdas no vacías`,
    '',
    '| Celda | Fórmula | Valor |',
    '|---|---|---|',
    ...celdas.map(
      (c) =>
        `| ${c.celda} | ${c.formula ? '`=' + c.formula.replace(/\|/g, '\\|') + '`' : ''} | ${
          c.valor === null ? '' : String(c.valor).replace(/\|/g, '\\|')
        } |`
    ),
  ];
  writeFileSync(mdPath, lineasMd.join('\n'));

  console.log(`✓ ${nombreHoja}: ${celdas.length} celdas → ${jsonPath}`);
  if (rango && (rango.e.r > 5000 || rango.e.c > 200)) {
    console.log(`  ⚠️  hoja grande (${rango.e.r + 1} filas × ${rango.e.c + 1} cols) — revisar el .md con cuidado`);
  }
}
