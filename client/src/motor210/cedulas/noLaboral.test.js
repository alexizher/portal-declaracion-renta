import { describe, it, expect } from 'vitest';
import { calcularCedulaNoLaboral } from './noLaboral.js';

const CONCEPTOS_VACIOS = {
  honorarios2omastrabajadores: 0,
  compensacionServicios2omastrabajadores: 0,
  contratosPrestacionServicios: 0,
  ventasMercancia: 0,
  ventasActividades: 0,
  ventasInventarios: 0,
  ventasActivosBiologicos: 0,
  construccion: 0,
  apoyosEducativos: 0,
  gananciales: 0,
  indemnizacionDanoEmergente: 0,
  indemnizacionLucroCesante: 0,
  indemnizacionSegurosVida: 0,
  retiroPensionSinPermanencia: 0,
  retiroAfcSinPermanencia: 0,
  ventaInmuebles: 0,
  ventaInversiones: 0,
  ventaActivosFijos: 0,
  colaboracionEmpresarial: 0,
  ingresosCAN: 0,
  ingresosExterior: 0,
  otros: 0,
};

// Mismo cliente anonimizado — no laboral: compensación por servicios
// personales con 2+ trabajadores contratados, $1.200.000 (único concepto
// de esta cédula en el caso real, CED.1 GENERAL columna J/K).
describe('calcularCedulaNoLaboral — caso dorado (cliente real AG2024, anonimizado)', () => {
  const input = {
    ingresos: { ...CONCEPTOS_VACIOS, compensacionServicios2omastrabajadores: 1200000 },
    devolucionesRebajas: 0,
    costosYGastos: 0,
    afcPensionVoluntaria: 0,
    viviendaDigitado: 0,
    icetexDigitado: 0,
  };
  const ctx = { uvt: 47065, viviendaDisponible: 1200 * 47065, icetexDisponible: 100 * 47065 };
  const resultado = calcularCedulaNoLaboral(input, ctx);

  it('ingresos brutos y renta líquida coinciden con el .xlsm (1.200.000, sin deducciones)', () => {
    expect(resultado.ingresosBrutos).toBe(1200000);
    expect(resultado.rentaLiquida).toBe(1200000);
  });
});
