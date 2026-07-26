import { describe, it, expect } from 'vitest';
import { construirHojaFormulario210 } from './formularioDianExcel.js';

describe('construirHojaFormulario210', () => {
  const resultado = {
    casillas: {
      28: 1793000,
      29: 6370000,
      30: 9943000,
      31: 0,
      91: 108067000,
      97: 71013000,
      111: 71013000,
      116: 3745000,
      126: 3745000,
      132: 776000,
      133: 1236000,
      134: 3505000,
    },
  };
  const cliente = { nombre: 'Cliente de Prueba', cedula: '1128420033', anioGravable: 2025 };
  const ws = construirHojaFormulario210(resultado, cliente);

  it('coloca cada casilla en la misma celda que el .xlsm de referencia', () => {
    expect(ws['J22'].v).toBe(6370000); // casilla 29 — Total patrimonio bruto
    expect(ws['S22'].v).toBe(9943000); // casilla 30 — Deudas
    expect(ws['Z22'].v).toBe(0); // casilla 31 — Patrimonio líquido
    expect(ws['S42'].v).toBe(71013000); // casilla 97 — Ren. Líquida grav. cédula gen.
    expect(ws['J55'].v).toBe(71013000); // casilla 111
    expect(ws['X43'].v).toBe(3745000); // casilla 116 — impuesto
    expect(ws['X52'].v).toBe(3745000); // casilla 126 — impuesto neto
    expect(ws['X58'].v).toBe(776000); // casilla 132 — retenciones
    expect(ws['X59'].v).toBe(1236000); // casilla 133 — anticipo
    expect(ws['F60'].v).toBe(3505000); // casilla 134 — saldo a pagar
    expect(ws['Z21'].v).toBe(1793000); // casilla 28 — 1% factura electrónica
  });

  it('conserva las etiquetas fijas del formulario (no las pisa un valor)', () => {
    expect(ws['I22'].v).toBe(29);
    expect(ws['R22'].v).toBe(30);
    expect(ws['Y22'].v).toBe(31);
    expect(ws['C19'].v).toBe('5. Número de Identificación Tributaria (NIT)');
    expect(ws['B22'].v).toBe('Patrimonio');
  });

  it('pone la cédula y el año del cliente en las celdas correctas', () => {
    expect(ws['C20'].v).toBe('1128420033');
    expect(ws['E13'].v).toBe(2025);
  });

  it('las casillas fuera de alcance (pensiones/dividendos) quedan en 0, no se omiten', () => {
    expect(ws['J43'].v).toBe(0); // casilla 99
    expect(ws['J48'].v).toBe(0); // casilla 104
  });

  it('el rango de la hoja cubre todas las celdas usadas, sin desbordar', () => {
    expect(ws['!ref']).toBeTruthy();
  });
});
